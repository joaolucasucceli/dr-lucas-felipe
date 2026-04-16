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

  const baseMensagem = () =>
    supabaseAdmin
      .from("mensagens_whatsapp")
      .select("id", { count: "exact", head: true })
      .gte("criadoEm", dataInicioIso)
      .lte("criadoEm", dataFimIso)

  const baseConversa = () =>
    supabaseAdmin
      .from("conversas")
      .select("id", { count: "exact", head: true })
      .gte("criadoEm", dataInicioIso)
      .lte("criadoEm", dataFimIso)

  const baseConversaAtualizadas = () =>
    supabaseAdmin
      .from("conversas")
      .select("id, followUpEnviados", { count: "exact" })
      .gte("atualizadoEm", dataInicioIso)
      .lte("atualizadoEm", dataFimIso)

  const [
    totalMensagensRes,
    enviadasRes,
    recebidasRes,
    totalConversasRes,
    conversasAtivasRes,
    conversasEncerradasRes,
    followUpsRes,
  ] = await Promise.all([
    baseMensagem(),
    baseMensagem().eq("remetente", "agente"),
    baseMensagem().eq("remetente", "paciente"),
    baseConversa(),
    baseConversa().is("encerradaEm", null),
    baseConversa().not("encerradaEm", "is", null),
    baseConversaAtualizadas(),
  ])

  const followUpsConversas = (followUpsRes.data ?? []).filter(
    (c) => (c.followUpEnviados ?? []).length > 0
  )

  const followUpsEnviados = followUpsConversas.length

  const conversaIdsComFollowUp = followUpsConversas.map((c) => c.id)

  let conversasRespondidas = 0
  if (conversaIdsComFollowUp.length > 0) {
    const { data: msgsRespondidas } = await supabaseAdmin
      .from("mensagens_whatsapp")
      .select("conversaId")
      .eq("remetente", "paciente")
      .gte("criadoEm", dataInicioIso)
      .in("conversaId", conversaIdsComFollowUp)

    const conversasComResposta = new Set((msgsRespondidas ?? []).map((m) => m.conversaId))
    conversasRespondidas = conversasComResposta.size
  }

  const taxaResposta =
    followUpsEnviados > 0
      ? Math.round((conversasRespondidas / followUpsEnviados) * 1000) / 10
      : 0

  const tempoMedioResposta = 0

  return NextResponse.json({
    periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() },
    mensagens: {
      total: totalMensagensRes.count ?? 0,
      enviadas: enviadasRes.count ?? 0,
      recebidas: recebidasRes.count ?? 0,
    },
    conversas: {
      total: totalConversasRes.count ?? 0,
      ativas: conversasAtivasRes.count ?? 0,
      encerradas: conversasEncerradasRes.count ?? 0,
      tempoMedioResposta,
    },
    followUps: { enviados: followUpsEnviados, taxaResposta },
  })
}
