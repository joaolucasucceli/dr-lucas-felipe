import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { ehHorarioComercial } from "@/lib/agente/horario-comercial"
import { buscarConversasParaFollowUp, enviarFollowUp } from "@/lib/agente/followup"
import {
  buscarAgendamentosParaConfirmacao,
  enviarConfirmacao,
} from "@/lib/agente/confirmacao"
import { agora } from "@/lib/db-utils"

export async function POST() {
  const { error } = await requireRole("gestor")
  if (error) return error

  const { data: configWa } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .maybeSingle()

  const resultado = {
    followups: 0,
    confirmacoes: 0,
    autoClose: 0,
    horarioComercial: ehHorarioComercial(),
    timestamp: new Date().toISOString(),
  }

  if (!configWa?.instanceToken) {
    return NextResponse.json({ ...resultado, motivo: "sem_config_whatsapp" })
  }

  if (resultado.horarioComercial) {
    try {
      const pendentesFollowUp = await buscarConversasParaFollowUp()
      for (const { conversa, tipo } of pendentesFollowUp) {
        try {
          await enviarFollowUp(conversa, tipo, configWa)
          resultado.followups++
        } catch (err) {
          console.error("[cron-manual] followup falhou:", conversa.id, err)
        }
      }
    } catch (err) {
      console.error("[cron-manual] buscarConversasParaFollowUp falhou:", err)
    }

    try {
      const pendentesConfirmacao = await buscarAgendamentosParaConfirmacao()
      for (const { agendamento, tipo } of pendentesConfirmacao) {
        try {
          await enviarConfirmacao(agendamento, tipo, configWa)
          resultado.confirmacoes++
        } catch (err) {
          console.error("[cron-manual] confirmacao falhou:", agendamento.id, err)
        }
      }
    } catch (err) {
      console.error("[cron-manual] buscarAgendamentosParaConfirmacao falhou:", err)
    }
  }

  try {
    const ha24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: conversas } = await supabaseAdmin
      .from("conversas")
      .select("id, followUpEnviados")
      .is("encerradaEm", null)
      .not("ultimaMensagemEm", "is", null)
      .lt("ultimaMensagemEm", ha24h)

    const pendentes = (conversas ?? []).filter((c) =>
      (c.followUpEnviados ?? []).includes("24h")
    )

    for (const conversa of pendentes) {
      try {
        await supabaseAdmin
          .from("conversas")
          .update({ encerradaEm: agora(), atualizadoEm: agora() })
          .eq("id", conversa.id)
        resultado.autoClose++
      } catch (err) {
        console.error("[cron-manual] auto-close falhou:", conversa.id, err)
      }
    }
  } catch (err) {
    console.error("[cron-manual] auto-close query falhou:", err)
  }

  return NextResponse.json(resultado)
}
