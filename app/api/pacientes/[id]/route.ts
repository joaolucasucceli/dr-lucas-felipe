import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarPacienteSchema } from "@/lib/validations/paciente"
import { registrarAuditLog } from "@/lib/audit"
import { checkRateLimitPaciente, registrarTentativaPaciente } from "@/lib/rate-limit"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const paciente = await prisma.paciente.findUnique({
    where: { id, deletadoEm: null },
    include: {
      prontuario: {
        include: {
          anamnese: true,
          _count: {
            select: {
              evolucoes: true,
              documentos: true,
              fotos: true,
            },
          },
        },
      },
      agendamentos: {
        orderBy: { dataHora: "desc" },
        take: 10,
        include: {
          procedimento: {
            select: { id: true, nome: true },
          },
        },
      },
      leadOrigem: {
        select: { id: true, nome: true, whatsapp: true },
      },
    },
  })

  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  return NextResponse.json(paciente)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

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
  const parsed = atualizarPacienteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const pacienteAtual = await prisma.paciente.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!pacienteAtual) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  const { cpf, dataNascimento, consentimentoLgpd, ...resto } = parsed.data

  // Verificar CPF único se mudou
  if (cpf && cpf.length === 11 && cpf !== pacienteAtual.cpf) {
    const existente = await prisma.paciente.findUnique({ where: { cpf } })
    if (existente) {
      return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 })
    }
  }

  const dadosUpdate: Record<string, unknown> = { ...resto }
  if (cpf !== undefined) {
    dadosUpdate.cpf = cpf && cpf.length === 11 ? cpf : null
  }
  if (dataNascimento !== undefined) {
    dadosUpdate.dataNascimento = dataNascimento ? new Date(dataNascimento) : null
  }
  if (consentimentoLgpd !== undefined) {
    dadosUpdate.consentimentoLgpd = consentimentoLgpd
    if (consentimentoLgpd && !pacienteAtual.consentimentoLgpd) {
      dadosUpdate.consentimentoLgpdEm = new Date()
    }
  }

  const pacienteAtualizado = await prisma.paciente.update({
    where: { id },
    data: dadosUpdate,
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "Paciente",
    entidadeId: id,
    dadosAntes: pacienteAtual as unknown as Record<string, unknown>,
    dadosDepois: pacienteAtualizado as unknown as Record<string, unknown>,
  })

  return NextResponse.json(pacienteAtualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const paciente = await prisma.paciente.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  await prisma.paciente.update({
    where: { id },
    data: {
      deletadoEm: new Date(),
      ativo: false,
    },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "Paciente",
    entidadeId: id,
    dadosAntes: paciente as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ mensagem: "Paciente removido" })
}
