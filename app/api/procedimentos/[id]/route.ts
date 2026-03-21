import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarProcedimentoSchema } from "@/lib/validations/procedimento"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const procedimento = await prisma.procedimento.findUnique({
    where: { id, deletadoEm: null },
    select: {
      id: true,
      nome: true,
      tipo: true,
      descricao: true,
      valorBase: true,
      duracaoMin: true,
      posOperatorio: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  })

  if (!procedimento) {
    return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 })
  }

  return NextResponse.json(procedimento)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarProcedimentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const procedimentoAtual = await prisma.procedimento.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!procedimentoAtual) {
    return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 })
  }

  const procedimentoAtualizado = await prisma.procedimento.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      nome: true,
      tipo: true,
      descricao: true,
      valorBase: true,
      duracaoMin: true,
      posOperatorio: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  })


  return NextResponse.json(procedimentoAtualizado)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const procedimento = await prisma.procedimento.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!procedimento) {
    return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 })
  }

  await prisma.procedimento.update({
    where: { id },
    data: {
      deletadoEm: new Date(),
      ativo: false,
    },
  })

  return NextResponse.json({ mensagem: "Procedimento removido" })
}
