import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const existente = await prisma.tipoProcedimento.findUnique({ where: { id } })
  if (!existente) {
    return NextResponse.json({ error: "Tipo não encontrado" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (typeof body.nome === "string") {
    const nome = body.nome.trim()
    if (nome.length < 2) {
      return NextResponse.json({ error: "Nome deve ter pelo menos 2 caracteres" }, { status: 400 })
    }
    if (nome !== existente.nome) {
      const duplicado = await prisma.tipoProcedimento.findUnique({ where: { nome } })
      if (duplicado) {
        return NextResponse.json({ error: "Já existe um tipo com esse nome" }, { status: 409 })
      }
    }
    data.nome = nome
  }

  if (typeof body.ativo === "boolean") {
    data.ativo = body.ativo
  }

  const tipo = await prisma.tipoProcedimento.update({
    where: { id },
    data,
    select: { id: true, nome: true, ativo: true, criadoEm: true },
  })

  return NextResponse.json(tipo)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const existente = await prisma.tipoProcedimento.findUnique({ where: { id } })
  if (!existente) {
    return NextResponse.json({ error: "Tipo não encontrado" }, { status: 404 })
  }

  const emUso = await prisma.procedimento.count({
    where: { tipo: existente.nome, deletadoEm: null },
  })
  if (emUso > 0) {
    return NextResponse.json(
      { error: `Tipo em uso em ${emUso} procedimento(s). Desative-o em vez de excluir.` },
      { status: 409 }
    )
  }

  await prisma.tipoProcedimento.delete({ where: { id } })

  return NextResponse.json({ sucesso: true })
}
