import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarBaseConhecimentoSchema } from "@/lib/validations/base-conhecimento"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const registro = await prisma.baseConhecimento.findUnique({
    where: { id, deletadoEm: null },
    select: {
      id: true,
      titulo: true,
      conteudo: true,
      secao: true,
      ordem: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  })

  if (!registro) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
  }

  return NextResponse.json(registro)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarBaseConhecimentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const atual = await prisma.baseConhecimento.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!atual) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
  }

  const atualizado = await prisma.baseConhecimento.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      titulo: true,
      conteudo: true,
      secao: true,
      ordem: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  })

  return NextResponse.json(atualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const registro = await prisma.baseConhecimento.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!registro) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
  }

  await prisma.baseConhecimento.update({
    where: { id },
    data: {
      deletadoEm: new Date(),
      ativo: false,
    },
  })

  return NextResponse.json({ mensagem: "Registro removido" })
}
