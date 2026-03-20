import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const agora = new Date()
  const tressDiasAtras = new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000)
  const vintQuatroHorasAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  const vintQuatroHorasAFrente = new Date(agora.getTime() + 24 * 60 * 60 * 1000)

  const usuarioIA = await prisma.usuario.findFirst({
    where: { email: "ia@drlucas.com.br" },
    select: { id: true },
  })

  const [leadsAlerta, agendamentosProximos, leadsNovosIA] = await Promise.all([
    prisma.lead.findMany({
      where: {
        deletadoEm: null,
        arquivado: false,
        statusFunil: {
          notIn: ["concluido", "perdido"] as never[],
        },
        ultimaMovimentacaoEm: { lt: tressDiasAtras },
      },
      select: { id: true, nome: true, statusFunil: true, ultimaMovimentacaoEm: true },
      take: 5,
    }),
    prisma.agendamento.findMany({
      where: {
        status: "agendado",
        dataHora: { gte: agora, lte: vintQuatroHorasAFrente },
      },
      select: {
        id: true,
        dataHora: true,
        status: true,
        lead: { select: { nome: true } },
      },
      take: 5,
      orderBy: { dataHora: "asc" },
    }),
    usuarioIA
      ? prisma.lead.findMany({
          where: {
            responsavelId: usuarioIA.id,
            criadoEm: { gte: vintQuatroHorasAtras },
          },
          select: { id: true, nome: true, criadoEm: true },
          take: 3,
          orderBy: { criadoEm: "desc" },
        })
      : Promise.resolve([]),
  ])

  const total = leadsAlerta.length + agendamentosProximos.length + leadsNovosIA.length

  return NextResponse.json({ leadsAlerta, agendamentosProximos, leadsNovosIA, total })
}
