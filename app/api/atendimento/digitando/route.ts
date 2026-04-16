import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { enviarDigitando } from "@/lib/uazapi"
import { z } from "zod"

const schema = z.object({
  conversaId: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "conversaId obrigatório" }, { status: 400 })
  }

  const { data: conversa } = await supabaseAdmin
    .from("conversas")
    .select("id, lead:leads!conversas_leadId_fkey(whatsapp)")
    .eq("id", parse.data.conversaId)
    .maybeSingle()

  if (!conversa) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  const lead = conversa.lead as unknown as { whatsapp: string } | null
  if (!lead) {
    return NextResponse.json({ error: "Lead da conversa não encontrado" }, { status: 404 })
  }

  const { data: config } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .maybeSingle()

  if (!config?.instanceToken || !config?.uazapiUrl) {
    return NextResponse.json({ error: "WhatsApp não configurado" }, { status: 400 })
  }

  const chatId = `${lead.whatsapp}@s.whatsapp.net`

  try {
    await enviarDigitando(config.uazapiUrl, config.instanceToken, chatId, true)
  } catch {
    // Não bloquear se falhar
  }

  return NextResponse.json({ sucesso: true })
}
