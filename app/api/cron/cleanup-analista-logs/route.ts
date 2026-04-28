import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarCronSecret } from "@/lib/cron-auth"

const DIAS_RETENCAO = 90

export const maxDuration = 300

/**
 * Cron diario — remove analista_logs com mais de 90 dias.
 * A Eduarda grava 1 row por turno da IA (debug + auditoria do que foi
 * sugerido vs aplicado). Sem retencao a tabela cresce indefinidamente
 * e degrada queries que joinam por contatoId.
 *
 * 90 dias e suficiente pra debug/replay de qualquer conversa recente.
 */
export async function GET(request: NextRequest) {
  const erro = validarCronSecret(request)
  if (erro) return erro

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DIAS_RETENCAO)

  const { count, error } = await supabaseAdmin
    .from("analista_logs")
    .delete({ count: "exact" })
    .lt("criadoEm", cutoff.toISOString())

  if (error) {
    return NextResponse.json(
      { error: error.message, removidos: 0 },
      { status: 500 }
    )
  }

  return NextResponse.json({
    removidos: count ?? 0,
    cutoff: cutoff.toISOString(),
    diasRetencao: DIAS_RETENCAO,
  })
}
