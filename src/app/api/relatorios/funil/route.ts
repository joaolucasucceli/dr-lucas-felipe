import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { ETAPAS_FUNIL, FUNIL_CORES, FUNIL_LABELS } from "@/lib/funil"

const etapasConvertidas = ["consulta_agendada"]

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
    .from("contatos")
    .select("statusFunil, criadoEm, ultimaMovimentacaoEm")
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .gte("criadoEm", dataInicioIso)
    .lte("criadoEm", dataFimIso)

  if (origem) baseQuery = baseQuery.eq("origem", origem)

  const { data: leadsAll } = await baseQuery

  const totalEntradas = leadsAll?.length ?? 0
  const leadsConvertidos = (leadsAll ?? []).filter((l) =>
    l.statusFunil ? etapasConvertidas.includes(l.statusFunil) : false
  ).length

  const etapaCount: Record<string, number> = {}
  for (const lead of leadsAll ?? []) {
    if (!lead.statusFunil) continue
    etapaCount[lead.statusFunil] = (etapaCount[lead.statusFunil] ?? 0) + 1
  }

  const leadsParaTempoMedio = (leadsAll ?? [])
    .filter(
      (l) =>
        l.statusFunil && etapasConvertidas.includes(l.statusFunil) && l.ultimaMovimentacaoEm
    )
    .slice(0, 100)

  const funil = ETAPAS_FUNIL.map((etapa, idx) => {
    const total = etapaCount[etapa] ?? 0
    const anterior =
      idx === 0
        ? totalEntradas
        : (ETAPAS_FUNIL
            .slice(0, idx)
            .map((e) => etapaCount[e] ?? 0)
            .find((v) => v > 0) ?? totalEntradas)
    const conversao = anterior > 0 ? Math.round((total / anterior) * 1000) / 10 : 0

    return {
      etapa,
      label: FUNIL_LABELS[etapa] || etapa,
      total,
      conversao,
      cor: FUNIL_CORES[etapa] || "#94a3b8",
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
