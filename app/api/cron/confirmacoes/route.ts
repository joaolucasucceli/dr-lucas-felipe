import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarCronSecret } from "@/lib/cron-auth"
import { ehHorarioComercial } from "@/lib/agente/horario-comercial"
import {
  buscarAgendamentosParaConfirmacao,
  enviarConfirmacao,
} from "@/lib/agente/confirmacao"

export async function GET(request: NextRequest) {
  const erro = validarCronSecret(request)
  if (erro) return erro

  if (!ehHorarioComercial()) {
    return NextResponse.json({ skipped: "fora_horario", enviadas: 0 })
  }

  const configWa = await prisma.configWhatsapp.findFirst({
    where: { ativo: true },
  })

  if (!configWa?.instanceToken) {
    return NextResponse.json({ enviadas: 0, motivo: "sem_config" })
  }

  const pendentes = await buscarAgendamentosParaConfirmacao()
  let enviadas = 0

  for (const { agendamento, tipo } of pendentes) {
    try {
      await enviarConfirmacao(agendamento, tipo, configWa)
      enviadas++
    } catch (error) {
      console.error(
        `[Cron Confirmação] Erro ao enviar ${tipo} para agendamento ${agendamento.id}:`,
        error
      )
    }
  }

  return NextResponse.json({ enviadas, timestamp: new Date().toISOString() })
}
