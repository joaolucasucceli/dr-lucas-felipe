import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarCronSecret } from "@/lib/cron-auth"
import { agora } from "@/lib/db-utils"

export async function GET(request: NextRequest) {
  const erro = validarCronSecret(request)
  if (erro) return erro

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

  let encerradas = 0

  for (const conversa of pendentes) {
    try {
      await supabaseAdmin
        .from("conversas")
        .update({ encerradaEm: agora(), atualizadoEm: agora() })
        .eq("id", conversa.id)
      encerradas++
    } catch (error) {
      console.error(`[Cron Auto-close] Erro ao encerrar conversa ${conversa.id}:`, error)
    }
  }

  return NextResponse.json({ encerradas, timestamp: new Date().toISOString() })
}
