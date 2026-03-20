import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { filtro?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const where: Record<string, unknown> = {
    ativo: true,
    deletadoEm: null,
  }

  if (body.filtro) {
    where.nome = { contains: body.filtro, mode: "insensitive" }
  }

  const procedimentos = await prisma.procedimento.findMany({
    where,
    select: {
      id: true,
      nome: true,
      tipo: true,
      descricao: true,
      duracaoMin: true,
      posOperatorio: true,
      // NUNCA retornar valorBase — agente não informa preço
    },
    orderBy: { nome: "asc" },
  })

  return NextResponse.json({ procedimentos })
}
