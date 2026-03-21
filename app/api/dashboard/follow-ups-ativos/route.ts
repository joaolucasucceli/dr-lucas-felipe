import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const conversas = await prisma.conversa.findMany({
    where: {
      followUpEnviados: { isEmpty: false },
      encerradaEm: null,
      lead: { deletadoEm: null, arquivado: false },
    },
    select: {
      followUpEnviados: true,
      ultimaMensagemEm: true,
      lead: {
        select: {
          id: true,
          nome: true,
          statusFunil: true,
          procedimentoInteresse: true,
        },
      },
    },
    orderBy: { ultimaMensagemEm: "asc" },
    take: 10,
  })

  const leads = conversas.map(({ lead, followUpEnviados, ultimaMensagemEm }) => ({
    ...lead,
    followUpEnviados,
    ultimaMensagemEm: ultimaMensagemEm?.toISOString() ?? null,
  }))

  return NextResponse.json({ leads })
}
