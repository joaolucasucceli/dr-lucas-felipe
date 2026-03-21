import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const agora = new Date()
  const dataInicio = searchParams.get("dataInicio")
    ? new Date(searchParams.get("dataInicio")!)
    : new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dataFim = searchParams.get("dataFim")
    ? new Date(searchParams.get("dataFim")!)
    : agora

  const filtroAgendamento = { criadoEm: { gte: dataInicio, lte: dataFim } }

  const [
    totalAgendamentos,
    realizados,
    cancelados,
    procedimentosRaw,
    origensRaw,
    agendamentosPorOrigem,
  ] = await Promise.all([
    prisma.agendamento.count({ where: filtroAgendamento }),
    prisma.agendamento.count({ where: { ...filtroAgendamento, status: "realizado" } }),
    prisma.agendamento.count({ where: { ...filtroAgendamento, status: "cancelado" } }),
    prisma.agendamento.groupBy({
      by: ["procedimentoId"],
      _count: { id: true },
      where: { ...filtroAgendamento, procedimentoId: { not: null } },
    }),
    prisma.lead.groupBy({
      by: ["origem"],
      _count: { id: true },
      where: { deletadoEm: null, arquivado: false, criadoEm: { gte: dataInicio, lte: dataFim } },
    }),
    prisma.agendamento.findMany({
      where: filtroAgendamento,
      select: { lead: { select: { origem: true } } },
    }),
  ])

  // Buscar nomes dos procedimentos
  const procIds = procedimentosRaw.map((p) => p.procedimentoId!).filter(Boolean)
  const procedimentosDb =
    procIds.length > 0
      ? await prisma.procedimento.findMany({
          where: { id: { in: procIds } },
          select: { id: true, nome: true },
        })
      : []

  const totalComProc = procedimentosRaw.reduce((acc, p) => acc + (p._count?.id ?? 0), 0)
  const procedimentos = procedimentosRaw.map((p) => {
    const proc = procedimentosDb.find((d) => d.id === p.procedimentoId)
    const quantidade = p._count?.id ?? 0
    return {
      nome: proc?.nome || "Sem procedimento",
      quantidade,
      percentual: totalComProc > 0 ? Math.round((quantidade / totalComProc) * 1000) / 10 : 0,
    }
  })

  // Conversão por origem
  const agendamentosPorOrigemMap: Record<string, number> = {}
  for (const a of agendamentosPorOrigem) {
    const orig = a.lead?.origem || "Não informada"
    agendamentosPorOrigemMap[orig] = (agendamentosPorOrigemMap[orig] ?? 0) + 1
  }

  const origem = origensRaw.map((g) => {
    const orig = g.origem || "Não informada"
    const leads = g._count?.id ?? 0
    const agends = agendamentosPorOrigemMap[orig] ?? 0
    return {
      origem: orig,
      leads,
      agendamentos: agends,
      conversao: leads > 0 ? Math.round((agends / leads) * 1000) / 10 : 0,
    }
  })

  const taxaRealizacao =
    totalAgendamentos > 0 ? Math.round((realizados / totalAgendamentos) * 1000) / 10 : 0

  return NextResponse.json({
    periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() },
    agendamentos: { total: totalAgendamentos, realizados, cancelados, taxaRealizacao },
    procedimentos,
    origem,
  })
}
