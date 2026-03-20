import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"
import { registrarAudit, getIpFromHeaders } from "@/lib/audit"
import { atualizarSprintItemSchema } from "@/lib/validations/sprint"

type RouteParams = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const { id, itemId } = await params
  const body = await request.json()
  const parsed = atualizarSprintItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const item = await prisma.sprintItem.findFirst({
    where: { id: itemId, sprintId: id },
  })

  if (!item) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
  }

  const itemAtualizado = await prisma.sprintItem.update({
    where: { id: itemId },
    data: parsed.data,
    select: {
      id: true,
      titulo: true,
      concluido: true,
      ordem: true,
      criadoEm: true,
    },
  })

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: "update",
    entidade: "SprintItem",
    entidadeId: itemId,
    dadosAntes: { titulo: item.titulo, concluido: item.concluido },
    dadosDepois: { titulo: itemAtualizado.titulo, concluido: itemAtualizado.concluido },
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json(itemAtualizado)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const { id, itemId } = await params

  const item = await prisma.sprintItem.findFirst({
    where: { id: itemId, sprintId: id },
  })

  if (!item) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
  }

  await prisma.sprintItem.delete({ where: { id: itemId } })

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: "delete",
    entidade: "SprintItem",
    entidadeId: itemId,
    dadosAntes: { titulo: item.titulo, sprintId: id },
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json({ mensagem: "Item removido" })
}
