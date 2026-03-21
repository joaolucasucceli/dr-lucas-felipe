import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const whereFollowUp = {
    deletadoEm: null,
    arquivado: false,
    conversas: {
      some: {
        encerradaEm: null,
        followUpEnviados: { isEmpty: false },
      },
    },
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: whereFollowUp,
      select: {
        id: true,
        nome: true,
        statusFunil: true,
        procedimentoInteresse: true,
        conversas: {
          where: { encerradaEm: null, followUpEnviados: { isEmpty: false } },
          select: { followUpEnviados: true, ultimaMensagemEm: true },
          take: 1,
          orderBy: { criadoEm: "desc" },
        },
      },
      take: 5,
    }),
    prisma.lead.count({ where: whereFollowUp }),
  ])

  const resultado = leads
    .map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      statusFunil: lead.statusFunil,
      procedimentoInteresse: lead.procedimentoInteresse,
      followUpEnviados: lead.conversas[0]?.followUpEnviados ?? [],
      ultimaMensagemEm: lead.conversas[0]?.ultimaMensagemEm?.toISOString() ?? null,
    }))
    .sort((a, b) => {
      if (!a.ultimaMensagemEm) return 1
      if (!b.ultimaMensagemEm) return -1
      return new Date(a.ultimaMensagemEm).getTime() - new Date(b.ultimaMensagemEm).getTime()
    })

  return NextResponse.json({ leads: resultado, total })
}
