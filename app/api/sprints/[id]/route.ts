import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"
import { registrarAudit, getIpFromHeaders } from "@/lib/audit"
import { atualizarSprintSchema } from "@/lib/validations/sprint"

type RouteParams = { params: Promise<{ id: string }> }

const sprintSelect = {
  id: true,
  nome: true,
  descricao: true,
  status: true,
  dataInicio: true,
  dataFim: true,
  ordem: true,
  criadoEm: true,
  atualizadoEm: true,
  itens: {
    select: {
      id: true,
      titulo: true,
      concluido: true,
      ordem: true,
      criadoEm: true,
    },
    orderBy: { ordem: "asc" as const },
  },
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const { id } = await params

  const sprint = await prisma.sprint.findUnique({
    where: { id, deletadoEm: null },
    select: sprintSelect,
  })

  if (!sprint) {
    return NextResponse.json({ error: "Sprint não encontrada" }, { status: 404 })
  }

  const total = sprint.itens.length
  const concluidos = sprint.itens.filter((i) => i.concluido).length
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0

  return NextResponse.json({ ...sprint, progresso })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarSprintSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const sprintAtual = await prisma.sprint.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!sprintAtual) {
    return NextResponse.json({ error: "Sprint não encontrada" }, { status: 404 })
  }

  const { dataInicio, dataFim, ...rest } = parsed.data

  const data: Record<string, unknown> = { ...rest }
  if (dataInicio !== undefined) data.dataInicio = dataInicio ? new Date(dataInicio) : null
  if (dataFim !== undefined) data.dataFim = dataFim ? new Date(dataFim) : null

  const sprintAtualizada = await prisma.sprint.update({
    where: { id },
    data,
    select: sprintSelect,
  })

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: "update",
    entidade: "Sprint",
    entidadeId: id,
    dadosAntes: {
      nome: sprintAtual.nome,
      status: sprintAtual.status,
      ordem: sprintAtual.ordem,
    },
    dadosDepois: {
      nome: sprintAtualizada.nome,
      status: sprintAtualizada.status,
      ordem: sprintAtualizada.ordem,
    },
    ip: getIpFromHeaders(request.headers),
  })

  const total = sprintAtualizada.itens.length
  const concluidos = sprintAtualizada.itens.filter((i) => i.concluido).length
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0

  return NextResponse.json({ ...sprintAtualizada, progresso })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const { id } = await params

  const sprint = await prisma.sprint.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!sprint) {
    return NextResponse.json({ error: "Sprint não encontrada" }, { status: 404 })
  }

  await prisma.sprint.update({
    where: { id },
    data: { deletadoEm: new Date() },
  })

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: "delete",
    entidade: "Sprint",
    entidadeId: id,
    dadosAntes: { nome: sprint.nome, status: sprint.status },
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json({ mensagem: "Sprint removida" })
}
