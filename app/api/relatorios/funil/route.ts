import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

const labelsFunil: Record<string, string> = {
  acolhimento: "Acolhimento",
  qualificacao: "Qualificação",
  pre_agendamento: "Pré-Agendamento",
  verificacao_humana: "Verificação",
  consulta_agendada: "Consulta Agendada",
  consulta_realizada: "Consulta Realizada",
  sinal_pago: "Sinal Pago",
  procedimento_agendado: "Procedimento Agendado",
  concluido: "Concluído",
  perdido: "Perdido",
}

const coresFunil: Record<string, string> = {
  acolhimento: "#a1a1aa",
  qualificacao: "#93c5fd",
  pre_agendamento: "#a5b4fc",
  verificacao_humana: "#fdba74",
  consulta_agendada: "#c4b5fd",
  consulta_realizada: "#86efac",
  sinal_pago: "#6ee7b7",
  procedimento_agendado: "#fcd34d",
  concluido: "#bbf7d0",
  perdido: "#fca5a5",
}

const ordemFunil = [
  "acolhimento",
  "qualificacao",
  "pre_agendamento",
  "verificacao_humana",
  "consulta_agendada",
  "consulta_realizada",
  "sinal_pago",
  "procedimento_agendado",
  "concluido",
  "perdido",
]

const etapasConvertidas = [
  "consulta_agendada",
  "consulta_realizada",
  "sinal_pago",
  "procedimento_agendado",
  "concluido",
]

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
  const origem = searchParams.get("origem") || undefined

  const dataInicioIso = dataInicio.toISOString()
  const dataFimIso = dataFim.toISOString()

  let baseQuery = supabaseAdmin
    .from("leads")
    .select("statusFunil, criadoEm, ultimaMovimentacaoEm")
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .gte("criadoEm", dataInicioIso)
    .lte("criadoEm", dataFimIso)

  if (origem) baseQuery = baseQuery.eq("origem", origem)

  const { data: leadsAll } = await baseQuery

  const totalEntradas = leadsAll?.length ?? 0
  const leadsConvertidos = (leadsAll ?? []).filter((l) =>
    etapasConvertidas.includes(l.statusFunil)
  ).length

  const etapaCount: Record<string, number> = {}
  for (const lead of leadsAll ?? []) {
    etapaCount[lead.statusFunil] = (etapaCount[lead.statusFunil] ?? 0) + 1
  }

  const leadsParaTempoMedio = (leadsAll ?? [])
    .filter(
      (l) =>
        etapasConvertidas.includes(l.statusFunil) && l.ultimaMovimentacaoEm
    )
    .slice(0, 100)

  const funil = ordemFunil.map((etapa, idx) => {
    const total = etapaCount[etapa] ?? 0
    const anterior =
      idx === 0
        ? totalEntradas
        : (ordemFunil
            .slice(0, idx)
            .map((e) => etapaCount[e] ?? 0)
            .find((v) => v > 0) ?? totalEntradas)
    const conversao = anterior > 0 ? Math.round((total / anterior) * 1000) / 10 : 0

    return {
      etapa,
      label: labelsFunil[etapa] || etapa,
      total,
      conversao,
      cor: coresFunil[etapa] || "#94a3b8",
    }
  })

  const taxaConversaoGeral =
    totalEntradas > 0
      ? Math.round((leadsConvertidos / totalEntradas) * 1000) / 10
      : 0

  const tempoMedioEtapas =
    leadsParaTempoMedio.length > 0
      ? Math.round(
          leadsParaTempoMedio.reduce((acc, l) => {
            if (!l.ultimaMovimentacaoEm) return acc
            return (
              acc +
              (new Date(l.ultimaMovimentacaoEm).getTime() -
                new Date(l.criadoEm).getTime())
            )
          }, 0) /
            leadsParaTempoMedio.length /
            (1000 * 60 * 60 * 24)
        )
      : 0

  return NextResponse.json({
    periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() },
    funil,
    totalEntradas,
    taxaConversaoGeral,
    tempoMedioEtapas,
  })
}
