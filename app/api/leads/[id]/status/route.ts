import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { registrarAudit, getIpFromHeaders } from "@/lib/audit"
import { mudarStatusSchema } from "@/lib/validations/lead"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = mudarStatusSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Status inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const lead = await prisma.lead.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const statusAnterior = lead.statusFunil

  const leadAtualizado = await prisma.lead.update({
    where: { id },
    data: { statusFunil: parsed.data.statusFunil },
    select: {
      id: true,
      nome: true,
      statusFunil: true,
    },
  })

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: "update",
    entidade: "Lead",
    entidadeId: id,
    dadosAntes: { statusFunil: statusAnterior },
    dadosDepois: { statusFunil: leadAtualizado.statusFunil },
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json(leadAtualizado)
}
