import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

const labelsFunil: Record<string, string> = {
  acolhimento: "Acolhimento",
  qualificacao: "Qualificação",
  agendamento: "Agendamento",
  consulta_agendada: "Reunião Agendada",
}

const coresFunil: Record<string, string> = {
  acolhimento: "#a1a1aa",
  qualificacao: "#93c5fd",
  agendamento: "#a5b4fc",
  consulta_agendada: "#c4b5fd",
}

const ordemFunil = [
  "acolhimento",
  "qualificacao",
  "agendamento",
  "consulta_agendada",
]

const etapasConvertidas = ["consulta_agendada"]

function calcularDataInicio(periodo: string): Date | null {
  const agoraTs = new Date()

  if (periodo === "total") return null

  if (periodo === "hoje") {
    const spDate = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(agoraTs)
    const [dia, mes, ano] = spDate.split("/")
    return new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`)
  }

  if (periodo === "semana") {
    return new Date(agoraTs.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  return new Date(agoraTs.getTime() - 30 * 24 * 60 * 60 * 1000)
}

async function contar(query: ReturnType<typeof supabaseAdmin.from>) {
  const { count } = await query.select("id", { count: "exact", head: true })
  return count ?? 0
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const periodo = request.nextUrl.searchParams.get("periodo") || "mes"
  const dataInicio = calcularDataInicio(periodo)
  const dataFim = new Date()
  const ha3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const dataInicioIso = dataInicio?.toISOString()

  const spHoje = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const [diaH, mesH, anoH] = spHoje.split("/")
  const inicioHoje = new Date(`${anoH}-${mesH}-${diaH}T00:00:00-03:00`).toISOString()

  const baseLeads = () =>
    supabaseAdmin
      .from("contatos")
      .select("id", { count: "exact", head: true })
      .is("deletadoEm", null)
      .eq("arquivado", false)
      .eq("tipo", "lead")

  const totalLeadsP = baseLeads()
  const leadsNovosP = (() => {
    const q = baseLeads()
    return dataInicioIso ? q.gte("criadoEm", dataInicioIso) : q
  })()
  const leadsConvertidosP = baseLeads().in("statusFunil", etapasConvertidas as never)
  const agendamentosNoPeriodoP = (() => {
    const q = supabaseAdmin
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
    return dataInicioIso ? q.gte("criadoEm", dataInicioIso) : q
  })()

  const leadsPorEtapaP = supabaseAdmin
    .from("contatos")
    .select("statusFunil")
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .eq("tipo", "lead")

  const leadsPorOrigemP = supabaseAdmin
    .from("contatos")
    .select("origem")
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .eq("tipo", "lead")

  const mensagensIaP = (() => {
    const q = supabaseAdmin
      .from("mensagens_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("remetente", "agente")
    return dataInicioIso ? q.gte("criadoEm", dataInicioIso) : q
  })()

  const followUpsP = (() => {
    const q = supabaseAdmin
      .from("conversas")
      .select("id, followUpEnviados", { count: "exact" })
    return dataInicioIso ? q.gte("atualizadoEm", dataInicioIso) : q
  })()

  const confirmacoesP = (() => {
    const q = supabaseAdmin
      .from("agendamentos")
      .select("id, confirmacoesEnviadas", { count: "exact" })
    return dataInicioIso ? q.gte("criadoEm", dataInicioIso) : q
  })()

  const leadsAlertaP = baseLeads()
    .or(`ultimaMovimentacaoEm.lt.${ha3dias},and(ultimaMovimentacaoEm.is.null,atualizadoEm.lt.${ha3dias})`)

  const pacientesRetornoP = supabaseAdmin
    .from("contatos")
    .select("id", { count: "exact", head: true })
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .eq("tipo", "paciente")
    .eq("ehRetorno", true)
  const leadsHojeP = baseLeads().gte("criadoEm", inicioHoje)
  const agendamentosSemanaP = supabaseAdmin
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .neq("status", "cancelado")
    .gte("dataHora", new Date().toISOString())
    .lte("dataHora", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

  const [
    totalLeadsRes,
    leadsNovosRes,
    leadsConvertidosRes,
    agendamentosNoPeriodoRes,
    leadsPorEtapaRes,
    leadsPorOrigemRes,
    mensagensIaRes,
    followUpsRes,
    confirmacoesRes,
    leadsAlertaRes,
    pacientesRetornoRes,
    leadsHojeRes,
    agendamentosSemanaRes,
  ] = await Promise.all([
    totalLeadsP,
    leadsNovosP,
    leadsConvertidosP,
    agendamentosNoPeriodoP,
    leadsPorEtapaP,
    leadsPorOrigemP,
    mensagensIaP,
    followUpsP,
    confirmacoesP,
    leadsAlertaP,
    pacientesRetornoP,
    leadsHojeP,
    agendamentosSemanaP,
  ])

  const totalLeads = totalLeadsRes.count ?? 0
  const leadsNovosNoPeriodo = leadsNovosRes.count ?? 0
  const leadsConvertidos = leadsConvertidosRes.count ?? 0
  const agendamentosNoPeriodo = agendamentosNoPeriodoRes.count ?? 0
  const mensagensEnviadasPelaIA = mensagensIaRes.count ?? 0
  const leadsEmAlerta = leadsAlertaRes.count ?? 0
  const pacientesRetorno = pacientesRetornoRes.count ?? 0
  const leadsHoje = leadsHojeRes.count ?? 0
  const agendamentosSemana = agendamentosSemanaRes.count ?? 0

  const followUpsEnviados = (followUpsRes.data ?? []).filter(
    (c) => (c.followUpEnviados ?? []).length > 0
  ).length

  const confirmacaoEnviadas = (confirmacoesRes.data ?? []).filter(
    (a) => (a.confirmacoesEnviadas ?? []).length > 0
  ).length

  const etapaCount: Record<string, number> = {}
  for (const lead of leadsPorEtapaRes.data ?? []) {
    const etapa = lead.statusFunil
    if (!etapa) continue
    etapaCount[etapa] = (etapaCount[etapa] ?? 0) + 1
  }

  const origemCount: Record<string, number> = {}
  for (const lead of leadsPorOrigemRes.data ?? []) {
    const origem = lead.origem || "Não informada"
    origemCount[origem] = (origemCount[origem] ?? 0) + 1
  }

  const taxaConversao =
    totalLeads > 0 ? Math.round((leadsConvertidos / totalLeads) * 1000) / 10 : 0

  const leadsPorEtapa = ordemFunil.map((etapa) => ({
    etapa,
    label: labelsFunil[etapa] || etapa,
    total: etapaCount[etapa] ?? 0,
    cor: coresFunil[etapa] || "#94a3b8",
  }))

  const leadsPorOrigem = Object.entries(origemCount).map(([origem, total]) => ({
    origem,
    total,
  }))

  const taxaRetorno =
    totalLeads > 0 ? Math.round((pacientesRetorno / totalLeads) * 1000) / 10 : 0

  const isAtendente = session!.user.perfil === "atendente"

  return NextResponse.json({
    totalLeads,
    leadsNovosNoPeriodo,
    taxaConversao,
    agendamentosNoPeriodo,
    leadsPorEtapa,
    leadsPorOrigem,
    mensagensEnviadasPelaIA: isAtendente ? 0 : mensagensEnviadasPelaIA,
    followUpsEnviados: isAtendente ? 0 : followUpsEnviados,
    confirmacaoEnviadas: isAtendente ? 0 : confirmacaoEnviadas,
    leadsEmAlerta,
    pacientesRetorno,
    taxaRetorno,
    leadsHoje,
    agendamentosSemana,
    periodo,
    dataInicio: dataInicio?.toISOString() ?? null,
    dataFim: dataFim.toISOString(),
  })
}
