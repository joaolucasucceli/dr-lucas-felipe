import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAnyRole } from "@/lib/auth-helpers"
import { registrarAudit, getIpFromHeaders } from "@/lib/audit"
import { criarLeadSchema } from "@/lib/validations/lead"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const pagina = Number(searchParams.get("pagina") || "1")
  const porPagina = Number(searchParams.get("porPagina") || "10")
  const statusFunil = searchParams.get("statusFunil")
  const procedimentoInteresse = searchParams.get("procedimentoInteresse")
  const responsavelId = searchParams.get("responsavelId")
  const origem = searchParams.get("origem")
  const arquivado = searchParams.get("arquivado")
  const busca = searchParams.get("busca")

  const where: Record<string, unknown> = {
    deletadoEm: null,
    arquivado: arquivado === "true" ? true : false,
  }

  if (statusFunil) where.statusFunil = statusFunil
  if (procedimentoInteresse) where.procedimentoInteresse = procedimentoInteresse
  if (responsavelId) where.responsavelId = responsavelId
  if (origem) where.origem = origem
  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: "insensitive" } },
      { whatsapp: { contains: busca } },
    ]
  }

  const [dados, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        email: true,
        procedimentoInteresse: true,
        statusFunil: true,
        origem: true,
        arquivado: true,
        criadoEm: true,
        responsavel: {
          select: { id: true, nome: true },
        },
      },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      orderBy: { criadoEm: "desc" },
    }),
    prisma.lead.count({ where }),
  ])

  return NextResponse.json({ dados, total, pagina, porPagina })
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "atendente", "desenvolvedor"])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarLeadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { whatsapp } = parsed.data

  const existente = await prisma.lead.findUnique({ where: { whatsapp } })
  if (existente) {
    return NextResponse.json(
      { error: "WhatsApp já cadastrado" },
      { status: 409 }
    )
  }

  const lead = await prisma.lead.create({
    data: parsed.data,
    select: {
      id: true,
      nome: true,
      whatsapp: true,
      email: true,
      procedimentoInteresse: true,
      statusFunil: true,
      origem: true,
      criadoEm: true,
    },
  })

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: "create",
    entidade: "Lead",
    entidadeId: lead.id,
    dadosDepois: lead,
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json(lead, { status: 201 })
}
