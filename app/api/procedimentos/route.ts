import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarProcedimentoSchema } from "@/lib/validations/procedimento"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const ativo = searchParams.get("ativo")
  const busca = searchParams.get("busca")

  const where: Record<string, unknown> = {
    deletadoEm: null,
  }

  if (ativo !== null && ativo !== undefined && ativo !== "") {
    where.ativo = ativo === "true"
  }
  if (busca) {
    where.nome = { contains: busca, mode: "insensitive" }
  }

  const dados = await prisma.procedimento.findMany({
    where,
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
    },
    orderBy: { nome: "asc" },
  })

  return NextResponse.json({ dados })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarProcedimentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const procedimento = await prisma.procedimento.create({
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
    },
  })

  return NextResponse.json(procedimento, { status: 201 })
}
