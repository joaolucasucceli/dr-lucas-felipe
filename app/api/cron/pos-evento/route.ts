import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarCronSecret } from "@/lib/cron-auth"
import { ehHorarioComercial } from "@/lib/agente/horario-comercial"
import {
  buscarAgendamentosParaPosEvento,
  enviarPosEvento,
} from "@/lib/agente/pos-evento"

export const maxDuration = 300

/**
 * Cron pos-evento: 1h apos `dataHora` do agendamento criado pela IA,
 * dispara mensagem "fez a reuniao?". Mesmo padrao do cron de confirmacoes:
 * so roda em horario comercial (evita mandar 22h se reuniao foi 21h) e
 * filtra criadoPor='ia' (manuais nao tem contexto pra responder).
 */
export async function GET(request: NextRequest) {
  const erro = validarCronSecret(request)
  if (erro) return erro

  if (!ehHorarioComercial()) {
    return NextResponse.json({ skipped: "fora_horario", enviadas: 0 })
  }

  const { data: configWa } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .maybeSingle()

  if (!configWa?.instanceToken) {
    return NextResponse.json({ enviadas: 0, motivo: "sem_config" })
  }

  const pendentes = await buscarAgendamentosParaPosEvento()
  let enviadas = 0

  for (const agendamento of pendentes) {
    try {
      await enviarPosEvento(agendamento, configWa)
      enviadas++
    } catch (error) {
      console.error(
        `[Cron Pos-evento] Erro ao enviar pra agendamento ${agendamento.id}:`,
        error
      )
    }
  }

  // Diag opcional pra debug (?diag=1): conta agendamentos brutos por filtro.
  const diag: Record<string, unknown> | undefined =
    request.nextUrl.searchParams.get("diag") === "1"
      ? await (async () => {
          const agoraTs = new Date()
          const ha1h = new Date(agoraTs.getTime() - 1 * 60 * 60 * 1000).toISOString()
          const ha12h = new Date(agoraTs.getTime() - 12 * 60 * 60 * 1000).toISOString()
          const { count: totalIa, error: e1 } = await supabaseAdmin
            .from("agendamentos")
            .select("id", { count: "exact", head: true })
            .eq("criadoPor", "ia")
          const { count: comStatusOk } = await supabaseAdmin
            .from("agendamentos")
            .select("id", { count: "exact", head: true })
            .eq("criadoPor", "ia")
            .in("status", ["agendado", "confirmado", "remarcado"])
          const { count: posEventoNull } = await supabaseAdmin
            .from("agendamentos")
            .select("id", { count: "exact", head: true })
            .eq("criadoPor", "ia")
            .in("status", ["agendado", "confirmado", "remarcado"])
            .is("posEventoEnviado", null)
          const { count: dentroJanela } = await supabaseAdmin
            .from("agendamentos")
            .select("id", { count: "exact", head: true })
            .eq("criadoPor", "ia")
            .in("status", ["agendado", "confirmado", "remarcado"])
            .is("posEventoEnviado", null)
            .gt("dataHora", ha12h)
            .lt("dataHora", ha1h)
          return {
            agoraServer: agoraTs.toISOString(),
            ha1h,
            ha12h,
            erro: e1?.message,
            totalIa,
            comStatusOk,
            posEventoNull,
            dentroJanela,
            pendentesRetornados: pendentes.length,
          }
        })()
      : undefined

  return NextResponse.json({ enviadas, timestamp: new Date().toISOString(), diag })
}
