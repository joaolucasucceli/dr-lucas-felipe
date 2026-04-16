import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarMidiaMarketingSchema } from "@/lib/validations/midia-marketing"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const midia = await prisma.midiaMarketing.findUnique({
    where: { id, deletadoEm: null },
  })
  if (!midia) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }
  return NextResponse.json(midia)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const existe = await prisma.midiaMarketing.findUnique({
    where: { id, deletadoEm: null },
  })
  if (!existe) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = atualizarMidiaMarketingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const midia = await prisma.midiaMarketing.update({
    where: { id },
    data: parsed.data,
  })
  return NextResponse.json(midia)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  await prisma.midiaMarketing.update({
    where: { id },
    data: { deletadoEm: new Date(), ativo: false },
  })
  return NextResponse.json({ mensagem: "Removido" })
}
