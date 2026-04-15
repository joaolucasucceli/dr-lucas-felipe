import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarBaseConhecimentoSchema } from "@/lib/validations/base-conhecimento"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const ativo = searchParams.get("ativo")
  const secao = searchParams.get("secao")
  const busca = searchParams.get("busca")

  const where: Record<string, unknown> = {
    deletadoEm: null,
  }

  if (ativo !== null && ativo !== undefined && ativo !== "") {
    where.ativo = ativo === "true"
  }
  if (secao) {
    where.secao = secao
  }
  if (busca) {
    where.OR = [
      { titulo: { contains: busca, mode: "insensitive" } },
      { conteudo: { contains: busca, mode: "insensitive" } },
    ]
  }

  const dados = await prisma.baseConhecimento.findMany({
    where,
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
    orderBy: [{ secao: "asc" }, { ordem: "asc" }, { titulo: "asc" }],
  })

  return NextResponse.json({ dados })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarBaseConhecimentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const registro = await prisma.baseConhecimento.create({
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

  return NextResponse.json(registro, { status: 201 })
}
