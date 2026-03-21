import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const dados = await prisma.tipoProcedimento.findMany({
    select: { id: true, nome: true, ativo: true, criadoEm: true },
    orderBy: { nome: "asc" },
  })

  return NextResponse.json({ dados })
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const nome = (body.nome as string | undefined)?.trim()
  if (!nome || nome.length < 2) {
    return NextResponse.json({ error: "Nome deve ter pelo menos 2 caracteres" }, { status: 400 })
  }

  const existente = await prisma.tipoProcedimento.findUnique({ where: { nome } })
  if (existente) {
    return NextResponse.json({ error: "Já existe um tipo com esse nome" }, { status: 409 })
  }

  const tipo = await prisma.tipoProcedimento.create({
    data: { nome },
    select: { id: true, nome: true, ativo: true, criadoEm: true },
  })

  return NextResponse.json(tipo, { status: 201 })
}
