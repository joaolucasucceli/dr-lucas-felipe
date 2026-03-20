import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarCronSecret } from "@/lib/cron-auth"
import { ehHorarioComercial } from "@/lib/agente/horario-comercial"
import { buscarConversasParaFollowUp, enviarFollowUp } from "@/lib/agente/followup"

export async function GET(request: NextRequest) {
  const erro = validarCronSecret(request)
  if (erro) return erro

  if (!ehHorarioComercial()) {
    return NextResponse.json({ skipped: "fora_horario", enviados: 0 })
  }

  const configWa = await prisma.configWhatsapp.findFirst({
    where: { ativo: true },
  })

  if (!configWa?.instanceToken) {
    return NextResponse.json({ enviados: 0, motivo: "sem_config" })
  }

  const pendentes = await buscarConversasParaFollowUp()
  let enviados = 0

  for (const { conversa, tipo } of pendentes) {
    try {
      await enviarFollowUp(conversa, tipo, configWa)
      enviados++
    } catch (error) {
      console.error(`[Cron Follow-up] Erro ao enviar ${tipo} para conversa ${conversa.id}:`, error)
    }
  }

  return NextResponse.json({ enviados, timestamp: new Date().toISOString() })
}
