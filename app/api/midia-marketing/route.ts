import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarMidiaMarketingSchema } from "@/lib/validations/midia-marketing"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const categoria = searchParams.get("categoria")
  const tipo = searchParams.get("tipo")
  const busca = searchParams.get("busca")
  const ativo = searchParams.get("ativo")

  const where: Record<string, unknown> = { deletadoEm: null }
  if (categoria) where.categoria = categoria
  if (tipo) where.tipo = tipo
  if (ativo !== null && ativo !== undefined && ativo !== "")
    where.ativo = ativo === "true"
  if (busca)
    where.titulo = { contains: busca, mode: "insensitive" }

  const dados = await prisma.midiaMarketing.findMany({
    where,
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }, { titulo: "asc" }],
  })

  return NextResponse.json({ dados })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarMidiaMarketingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const midia = await prisma.midiaMarketing.create({ data: parsed.data })
  return NextResponse.json(midia, { status: 201 })
}
