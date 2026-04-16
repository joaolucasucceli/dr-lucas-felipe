import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { enviarMidia } from "@/lib/uazapi"
import { criarId, agora } from "@/lib/db-utils"
import { z } from "zod"
import { randomUUID } from "crypto"

const tipoMidiaMap = {
  imagem: "image",
  audio: "ptt",
  documento: "document",
  video: "video",
} as const

const schema = z.object({
  conversaId: z.string().min(1),
  arquivoUrl: z.string().url(),
  tipo: z.enum(["imagem", "audio", "documento", "video"]),
  legenda: z.string().optional(),
  replyToId: z.string().optional(),
  nomeDocumento: z.string().optional(),
})

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parse.error.flatten() },
      { status: 400 }
    )
  }

  const { conversaId, arquivoUrl, tipo, legenda, replyToId, nomeDocumento } = parse.data

  const { data: conversa } = await supabaseAdmin
    .from("conversas")
    .select("id, leadId, lead:leads!conversas_leadId_fkey(whatsapp)")
    .eq("id", conversaId)
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

  let replyMessageId: string | undefined
  if (replyToId) {
    const { data: replyMsg } = await supabaseAdmin
      .from("mensagens_whatsapp")
      .select("messageIdWhatsapp")
      .eq("id", replyToId)
      .maybeSingle()
    if (replyMsg) replyMessageId = replyMsg.messageIdWhatsapp
  }

  const chatId = `${lead.whatsapp}@s.whatsapp.net`
  const tipoUazapi = tipoMidiaMap[tipo]

  await enviarMidia(
    config.uazapiUrl,
    config.instanceToken,
    chatId,
    arquivoUrl,
    tipoUazapi,
    legenda,
    replyMessageId,
    nomeDocumento
  )

  const conteudo = legenda || `[${tipo}]`

  const { data: mensagem, error: insertError } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .insert({
      id: criarId(),
      conversaId,
      leadId: conversa.leadId,
      messageIdWhatsapp: `atendente_${randomUUID()}`,
      tipo,
      conteudo,
      remetente: "atendente",
      mediaUrl: arquivoUrl,
      mediaType: tipo,
      replyToId: replyToId || null,
    })
    .select("*")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from("conversas")
    .update({ ultimaMensagemEm: agora(), atualizadoEm: agora() })
    .eq("id", conversaId)

  return NextResponse.json(mensagem, { status: 201 })
}
