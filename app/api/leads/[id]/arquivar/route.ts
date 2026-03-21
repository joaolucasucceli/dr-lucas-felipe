import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const novoArquivado = !lead.arquivado

  const leadAtualizado = await prisma.lead.update({
    where: { id },
    data: {
      arquivado: novoArquivado,
      arquivadoEm: novoArquivado ? new Date() : null,
    },
    select: {
      id: true,
      nome: true,
      arquivado: true,
      arquivadoEm: true,
    },
  })


  return NextResponse.json(leadAtualizado)
}
