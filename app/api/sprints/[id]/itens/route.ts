import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"
import { registrarAudit, getIpFromHeaders } from "@/lib/audit"
import { criarSprintItemSchema } from "@/lib/validations/sprint"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = criarSprintItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const sprint = await prisma.sprint.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!sprint) {
    return NextResponse.json({ error: "Sprint não encontrada" }, { status: 404 })
  }

  const ultimoItem = await prisma.sprintItem.findFirst({
    where: { sprintId: id },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  })

  const item = await prisma.sprintItem.create({
    data: {
      sprintId: id,
      titulo: parsed.data.titulo,
      ordem: parsed.data.ordem ?? (ultimoItem ? ultimoItem.ordem + 1 : 0),
    },
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
    acao: "create",
    entidade: "SprintItem",
    entidadeId: item.id,
    dadosDepois: { ...item, sprintId: id },
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json(item, { status: 201 })
}
