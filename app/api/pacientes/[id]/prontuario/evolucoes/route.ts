import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarEvolucaoSchema } from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get("tipo")
  const pagina = parseInt(searchParams.get("pagina") || "1")
  const porPagina = parseInt(searchParams.get("porPagina") || "20")

  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id, deletadoEm: null } },
    select: { id: true },
  })

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const where = {
    prontuarioId: prontuario.id,
    deletadoEm: null,
    ...(tipo ? { tipo: tipo as never } : {}),
  }

  const [evolucoes, total] = await Promise.all([
    prisma.evolucao.findMany({
      where,
      orderBy: { dataRegistro: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        procedimento: {
          select: { id: true, nome: true },
        },
        registroCirurgico: true,
      },
    }),
    prisma.evolucao.count({ where }),
  ])

  return NextResponse.json({ dados: evolucoes, total })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = criarEvolucaoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id, deletadoEm: null } },
    select: { id: true },
  })

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const { dataRegistro, ...resto } = parsed.data

  const evolucao = await prisma.evolucao.create({
    data: {
      prontuarioId: prontuario.id,
      ...resto,
      dataRegistro: dataRegistro ? new Date(dataRegistro) : new Date(),
    },
    include: {
      procedimento: {
        select: { id: true, nome: true },
      },
      registroCirurgico: true,
    },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "Evolucao",
    entidadeId: evolucao.id,
    dadosDepois: evolucao as unknown as Record<string, unknown>,
  })

  return NextResponse.json(evolucao, { status: 201 })
}
