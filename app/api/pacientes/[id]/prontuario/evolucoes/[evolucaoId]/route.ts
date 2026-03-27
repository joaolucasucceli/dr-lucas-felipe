import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarEvolucaoSchema } from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string; evolucaoId: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params

  // Verificar que a evolução pertence ao paciente
  const evolucao = await prisma.evolucao.findFirst({
    where: {
      id: evolucaoId,
      deletadoEm: null,
      prontuario: { paciente: { id, deletadoEm: null } },
    },
    include: {
      procedimento: {
        select: { id: true, nome: true },
      },
    },
  })

  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  return NextResponse.json(evolucao)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const body = await request.json()
  const parsed = atualizarEvolucaoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const evolucaoAtual = await prisma.evolucao.findFirst({
    where: {
      id: evolucaoId,
      deletadoEm: null,
      prontuario: { paciente: { id, deletadoEm: null } },
    },
  })

  if (!evolucaoAtual) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  const { dataRegistro, ...resto } = parsed.data

  const evolucaoAtualizada = await prisma.evolucao.update({
    where: { id: evolucaoId },
    data: {
      ...resto,
      ...(dataRegistro ? { dataRegistro: new Date(dataRegistro) } : {}),
    },
    include: {
      procedimento: {
        select: { id: true, nome: true },
      },
    },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "Evolucao",
    entidadeId: evolucaoId,
    dadosAntes: evolucaoAtual as unknown as Record<string, unknown>,
    dadosDepois: evolucaoAtualizada as unknown as Record<string, unknown>,
  })

  return NextResponse.json(evolucaoAtualizada)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params

  const evolucao = await prisma.evolucao.findFirst({
    where: {
      id: evolucaoId,
      deletadoEm: null,
      prontuario: { paciente: { id, deletadoEm: null } },
    },
  })

  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  await prisma.evolucao.update({
    where: { id: evolucaoId },
    data: { deletadoEm: new Date() },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "Evolucao",
    entidadeId: evolucaoId,
    dadosAntes: evolucao as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ mensagem: "Evolução removida" })
}
