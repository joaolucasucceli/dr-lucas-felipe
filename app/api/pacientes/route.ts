import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarPacienteSchema } from "@/lib/validations/paciente"
import { registrarAuditLog } from "@/lib/audit"
import { checkRateLimitPaciente, registrarTentativaPaciente } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const pagina = Number(searchParams.get("pagina") || "1")
  const porPagina = Number(searchParams.get("porPagina") || "10")
  const busca = searchParams.get("busca")
  const ativo = searchParams.get("ativo")

  const where: Record<string, unknown> = {
    deletadoEm: null,
  }

  if (ativo === "false") {
    where.ativo = false
  } else {
    where.ativo = true
  }

  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: "insensitive" } },
      { whatsapp: { contains: busca } },
      { cpf: { contains: busca } },
    ]
  }

  const [dados, total] = await Promise.all([
    prisma.paciente.findMany({
      where,
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        cpf: true,
        email: true,
        ativo: true,
        criadoEm: true,
        leadOrigemId: true,
      },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      orderBy: { criadoEm: "desc" },
    }),
    prisma.paciente.count({ where }),
  ])

  return NextResponse.json({ dados, total, pagina, porPagina })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  // Rate limit
  const rateLimitResult = await checkRateLimitPaciente(auth.session.user.id)
  if (rateLimitResult.bloqueado) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em alguns minutos." },
      { status: 429 }
    )
  }
  await registrarTentativaPaciente(auth.session.user.id)

  const body = await request.json()
  const parsed = criarPacienteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { cpf, dataNascimento, consentimentoLgpd, ...resto } = parsed.data

  // Verificar CPF único se fornecido
  if (cpf && cpf.length === 11) {
    const existente = await prisma.paciente.findUnique({ where: { cpf } })
    if (existente) {
      return NextResponse.json(
        { error: "CPF já cadastrado" },
        { status: 409 }
      )
    }
  }

  // Gerar número do prontuário
  const ultimoProntuario = await prisma.prontuario.findFirst({
    orderBy: { numero: "desc" },
    select: { numero: true },
  })
  const numeroProntuario = (ultimoProntuario?.numero ?? 0) + 1

  const paciente = await prisma.$transaction(async (tx) => {
    const novoPaciente = await tx.paciente.create({
      data: {
        ...resto,
        cpf: cpf && cpf.length === 11 ? cpf : null,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        consentimentoLgpd: consentimentoLgpd ?? false,
        consentimentoLgpdEm: consentimentoLgpd ? new Date() : null,
      },
    })

    // Criar prontuário + anamnese vazia automaticamente
    await tx.prontuario.create({
      data: {
        pacienteId: novoPaciente.id,
        numero: numeroProntuario,
        anamnese: {
          create: {},
        },
      },
    })

    return novoPaciente
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "Paciente",
    entidadeId: paciente.id,
    dadosDepois: paciente as unknown as Record<string, unknown>,
  })

  return NextResponse.json(paciente, { status: 201 })
}
