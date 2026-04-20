import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const agoraTs = new Date()
  const dataInicio = searchParams.get("dataInicio")
    ? new Date(searchParams.get("dataInicio")!)
    : new Date(agoraTs.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dataFim = searchParams.get("dataFim")
    ? new Date(searchParams.get("dataFim")!)
    : agoraTs

  const dataInicioIso = dataInicio.toISOString()
  const dataFimIso = dataFim.toISOString()

  const { data: agendamentosPeriodo } = await supabaseAdmin
    .from("agendamentos")
    .select("status, procedimentoId, lead:contatos!agendamentos_contatoId_fkey(origem)")
    .gte("criadoEm", dataInicioIso)
    .lte("criadoEm", dataFimIso)

  const totalAgendamentos = agendamentosPeriodo?.length ?? 0
  const realizados = (agendamentosPeriodo ?? []).filter(
    (a) => a.status === "realizado"
  ).length
  const cancelados = (agendamentosPeriodo ?? []).filter(
    (a) => a.status === "cancelado"
  ).length

  const procIdsContagem: Record<string, number> = {}
  for (const a of agendamentosPeriodo ?? []) {
    if (a.procedimentoId) {
      procIdsContagem[a.procedimentoId] = (procIdsContagem[a.procedimentoId] ?? 0) + 1
    }
  }

  const procIds = Object.keys(procIdsContagem)
  const { data: procedimentosDb } =
    procIds.length > 0
      ? await supabaseAdmin
          .from("procedimentos")
          .select("id, nome")
          .in("id", procIds)
      : { data: [] }

  const totalComProc = Object.values(procIdsContagem).reduce((acc, n) => acc + n, 0)
  const procedimentos = Object.entries(procIdsContagem).map(([id, quantidade]) => {
    const proc = procedimentosDb?.find((d) => d.id === id)
    return {
      nome: proc?.nome || "Sem procedimento",
      quantidade,
      percentual: totalComProc > 0 ? Math.round((quantidade / totalComProc) * 1000) / 10 : 0,
    }
  })

  const { data: leadsPeriodo } = await supabaseAdmin
    .from("contatos")
    .select("origem")
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .gte("criadoEm", dataInicioIso)
    .lte("criadoEm", dataFimIso)

  const leadsPorOrigem: Record<string, number> = {}
  for (const l of leadsPeriodo ?? []) {
    const orig = l.origem || "Não informada"
    leadsPorOrigem[orig] = (leadsPorOrigem[orig] ?? 0) + 1
  }

  const agendamentosPorOrigem: Record<string, number> = {}
  for (const a of agendamentosPeriodo ?? []) {
    const lead = a.lead as unknown as { origem: string | null } | null
    const orig = lead?.origem || "Não informada"
    agendamentosPorOrigem[orig] = (agendamentosPorOrigem[orig] ?? 0) + 1
  }

  const origem = Object.entries(leadsPorOrigem).map(([orig, leads]) => {
    const agends = agendamentosPorOrigem[orig] ?? 0
    return {
      origem: orig,
      leads,
      agendamentos: agends,
      conversao: leads > 0 ? Math.round((agends / leads) * 1000) / 10 : 0,
    }
  })

  const taxaRealizacao =
    totalAgendamentos > 0
      ? Math.round((realizados / totalAgendamentos) * 1000) / 10
      : 0

  return NextResponse.json({
    periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() },
    agendamentos: { total: totalAgendamentos, realizados, cancelados, taxaRealizacao },
    procedimentos,
    origem,
  })
}
