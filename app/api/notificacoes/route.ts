import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const agoraTs = new Date()
  const tressDiasAtras = new Date(agoraTs.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const vintQuatroHorasAtras = new Date(agoraTs.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const vintQuatroHorasAFrente = new Date(agoraTs.getTime() + 24 * 60 * 60 * 1000).toISOString()
  const agoraIso = agoraTs.toISOString()

  const { data: usuarioIA } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("email", "ia@drlucas.com.br")
    .maybeSingle()

  const [
    { data: leadsAlerta },
    { data: agendamentosProximos },
    leadsNovosIAResult,
    { data: leadsVerificacaoPendente },
  ] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id, nome, statusFunil, ultimaMovimentacaoEm")
      .is("deletadoEm", null)
      .eq("arquivado", false)
      .not("statusFunil", "in", "(concluido,perdido)")
      .lt("ultimaMovimentacaoEm", tressDiasAtras)
      .limit(5),
    supabaseAdmin
      .from("agendamentos")
      .select("id, dataHora, status, lead:leads!agendamentos_leadId_fkey(nome)")
      .eq("status", "agendado")
      .gte("dataHora", agoraIso)
      .lte("dataHora", vintQuatroHorasAFrente)
      .order("dataHora", { ascending: true })
      .limit(5),
    usuarioIA
      ? supabaseAdmin
          .from("leads")
          .select("id, nome, criadoEm")
          .eq("responsavelId", usuarioIA.id)
          .gte("criadoEm", vintQuatroHorasAtras)
          .order("criadoEm", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string; criadoEm: string }> }),
    supabaseAdmin
      .from("leads")
      .select("id, nome, procedimentoInteresse, ultimaMovimentacaoEm")
      .is("deletadoEm", null)
      .eq("arquivado", false)
      .eq("statusFunil", "verificacao_humana" as never)
      .order("ultimaMovimentacaoEm", { ascending: true })
      .limit(10),
  ])

  const leadsNovosIA = leadsNovosIAResult.data ?? []

  const total =
    (leadsAlerta?.length ?? 0) +
    (agendamentosProximos?.length ?? 0) +
    leadsNovosIA.length +
    (leadsVerificacaoPendente?.length ?? 0)

  return NextResponse.json({
    leadsAlerta: leadsAlerta ?? [],
    agendamentosProximos: agendamentosProximos ?? [],
    leadsNovosIA,
    leadsVerificacaoPendente: leadsVerificacaoPendente ?? [],
    total,
  })
}
