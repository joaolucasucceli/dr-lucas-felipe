import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { ehHorarioComercial } from "@/lib/agente/horario-comercial"
import { buscarConversasParaFollowUp, enviarFollowUp } from "@/lib/agente/followup"
import {
  buscarAgendamentosParaConfirmacao,
  enviarConfirmacao,
} from "@/lib/agente/confirmacao"

export async function POST() {
  const { error } = await requireRole("gestor")
  if (error) return error

  const configWa = await prisma.configWhatsapp.findFirst({
    where: { ativo: true },
  })

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

  // Follow-ups (só em horário comercial)
  if (resultado.horarioComercial) {
    try {
      const pendentesFollowUp = await buscarConversasParaFollowUp()
      for (const { conversa, tipo } of pendentesFollowUp) {
        try {
          await enviarFollowUp(conversa, tipo, configWa)
          resultado.followups++
        } catch {
          // Continuar com próximo
        }
      }
    } catch {
      // Ignorar erro geral
    }

    // Confirmações
    try {
      const pendentesConfirmacao = await buscarAgendamentosParaConfirmacao()
      for (const { agendamento, tipo } of pendentesConfirmacao) {
        try {
          await enviarConfirmacao(agendamento, tipo, configWa)
          resultado.confirmacoes++
        } catch {
          // Continuar com próximo
        }
      }
    } catch {
      // Ignorar erro geral
    }
  }

  // Auto-close (sempre, independente de horário)
  try {
    const ha24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const conversas = await prisma.conversa.findMany({
      where: {
        encerradaEm: null,
        ultimaMensagemEm: { not: null, lt: ha24h },
        followUpEnviados: { has: "24h" },
      },
      select: { id: true },
    })

    for (const conversa of conversas) {
      try {
        await prisma.conversa.update({
          where: { id: conversa.id },
          data: { encerradaEm: new Date() },
        })
        resultado.autoClose++
      } catch {
        // Continuar
      }
    }
  } catch {
    // Ignorar
  }

  return NextResponse.json(resultado)
}
