import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import {
  criarRegistroCirurgicoSchema,
  atualizarRegistroCirurgicoSchema,
} from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"
import type { Prisma } from "@/generated/prisma/client"

type RouteParams = { params: Promise<{ id: string; evolucaoId: string }> }

async function buscarEvolucao(pacienteId: string, evolucaoId: string) {
  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id: pacienteId, deletadoEm: null } },
    select: { id: true },
  })
  if (!prontuario) return null

  return prisma.evolucao.findFirst({
    where: { id: evolucaoId, prontuarioId: prontuario.id, deletadoEm: null },
    include: { registroCirurgico: true },
  })
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const evolucao = await buscarEvolucao(id, evolucaoId)

  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  return NextResponse.json({ dados: evolucao.registroCirurgico })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const body = await request.json()
  const parsed = criarRegistroCirurgicoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const evolucao = await buscarEvolucao(id, evolucaoId)
  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  if (evolucao.tipo !== "procedimento") {
    return NextResponse.json(
      { error: "Registro cirúrgico só pode ser vinculado a evolução tipo 'procedimento'" },
      { status: 400 }
    )
  }

  if (evolucao.registroCirurgico) {
    return NextResponse.json(
      { error: "Esta evolução já possui um registro cirúrgico" },
      { status: 409 }
    )
  }

  const { marcosRecuperacao, ...resto } = parsed.data

  const registro = await prisma.registroCirurgico.create({
    data: {
      evolucaoId,
      ...resto,
      marcosRecuperacao: marcosRecuperacao
        ? (marcosRecuperacao as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "RegistroCirurgico",
    entidadeId: registro.id,
    dadosDepois: registro as unknown as Record<string, unknown>,
  })

  return NextResponse.json(registro, { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const body = await request.json()
  const parsed = atualizarRegistroCirurgicoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const evolucao = await buscarEvolucao(id, evolucaoId)
  if (!evolucao || !evolucao.registroCirurgico) {
    return NextResponse.json({ error: "Registro cirúrgico não encontrado" }, { status: 404 })
  }

  const { marcosRecuperacao, ...resto } = parsed.data

  const dadosAntes = evolucao.registroCirurgico as unknown as Record<string, unknown>

  const registro = await prisma.registroCirurgico.update({
    where: { id: evolucao.registroCirurgico.id },
    data: {
      ...resto,
      ...(marcosRecuperacao !== undefined
        ? { marcosRecuperacao: marcosRecuperacao as unknown as Prisma.InputJsonValue }
        : {}),
    },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "RegistroCirurgico",
    entidadeId: registro.id,
    dadosAntes,
    dadosDepois: registro as unknown as Record<string, unknown>,
  })

  return NextResponse.json(registro)
}
