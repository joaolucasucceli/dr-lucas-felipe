import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { TipoMensagem } from "@/generated/prisma/enums"
import { adicionarAoBuffer, agendarProcessamento } from "@/lib/agente/buffer"
import { transcreverAudio, descreverImagem } from "@/lib/agente/processar-midia"
import { createClient } from "@supabase/supabase-js"

// ── Tipos UazapiGO v2 ─────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MensagemNormalizada {
  id: string
  chatId: string
  fromMe: boolean
  isGroup: boolean
  numero: string
  tipo: TipoMensagem
  conteudo: string
  mediaUrl: string | null
  timestamp: number
}

// ── Helpers ────────────────────────────────────────────────────────

function extrairNumero(jid: string): string {
  return jid.split("@")[0]
}

const MIME_MAP: Record<string, string> = {
  imagem: "image/jpeg",
  audio: "audio/ogg",
  documento: "application/octet-stream",
  video: "video/mp4",
}

async function downloadEUploadMidia(
  mediaUrl: string,
  tipo: TipoMensagem,
  messageId: string
): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return null

    const supabase = createClient(supabaseUrl, serviceKey)
    const res = await fetch(mediaUrl)
    if (!res.ok) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    const ext = tipo === "imagem" ? "jpg" : tipo === "audio" ? "ogg" : tipo === "video" ? "mp4" : "bin"
    const path = `webhook/${messageId}.${ext}`

    const { error } = await supabase.storage
      .from("atendimento-midias")
      .upload(path, buffer, {
        contentType: MIME_MAP[tipo] || "application/octet-stream",
        upsert: true,
      })

    if (error) return null

    const { data } = supabase.storage.from("atendimento-midias").getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

// ── Normalizar payload UazapiGO v2 ────────────────────────────────
// UazapiGO v2 envia { event: { Type, Chat, IsFromMe, Message, ... } }
// Formato diferente do Baileys/Evolution API

function normalizarUazapiV2(payload: any): MensagemNormalizada | null {
  const evt = payload?.event
  if (!evt || typeof evt !== "object") return null

  // Só processar mensagens recebidas (não receipts como Delivered/Read)
  const tipo = evt.Type || evt.type || ""
  const tiposMsg = ["Message", "message", "Text", "text", "Media", "media"]
  if (!tiposMsg.includes(tipo)) {
    console.log("[Webhook] Evento UazapiGO ignorado — tipo:", tipo)
    return null
  }

  const chatId = evt.Chat || evt.chat || evt.chatid || ""
  const isFromMe = evt.IsFromMe ?? evt.isFromMe ?? false
  const isGroup = evt.IsGroup ?? evt.isGroup ?? chatId.includes("@g.us")
  const messageId = evt.MessageIDs?.[0] || evt.ID || evt.id || evt.MessageID || ""
  const timestamp = evt.Timestamp || evt.timestamp || Math.floor(Date.now() / 1000)

  // Extrair conteúdo da mensagem
  const msg = evt.Message || evt.message || {}
  let conteudo = ""
  let mediaUrl: string | null = null
  let tipoMsg: TipoMensagem = "texto"

  // Texto
  if (typeof msg === "string") {
    conteudo = msg
  } else if (msg.Conversation || msg.conversation) {
    conteudo = msg.Conversation || msg.conversation
  } else if (msg.ExtendedTextMessage?.Text || msg.extendedTextMessage?.text) {
    conteudo = msg.ExtendedTextMessage?.Text || msg.extendedTextMessage?.text || ""
  }

  // Áudio
  if (msg.AudioMessage || msg.audioMessage) {
    tipoMsg = "audio"
    mediaUrl = msg.AudioMessage?.URL || msg.AudioMessage?.url ||
               msg.audioMessage?.url || null
  }
  // Imagem
  else if (msg.ImageMessage || msg.imageMessage) {
    tipoMsg = "imagem"
    mediaUrl = msg.ImageMessage?.URL || msg.ImageMessage?.url ||
               msg.imageMessage?.url || null
    const caption = msg.ImageMessage?.Caption || msg.ImageMessage?.caption ||
                    msg.imageMessage?.caption || ""
    if (caption) conteudo = caption
  }
  // Documento
  else if (msg.DocumentMessage || msg.documentMessage) {
    tipoMsg = "documento"
    mediaUrl = msg.DocumentMessage?.URL || msg.DocumentMessage?.url ||
               msg.documentMessage?.url || null
  }
  // Vídeo
  else if (msg.VideoMessage || msg.videoMessage) {
    tipoMsg = "video"
    mediaUrl = msg.VideoMessage?.URL || msg.VideoMessage?.url ||
               msg.videoMessage?.url || null
    const caption = msg.VideoMessage?.Caption || msg.VideoMessage?.caption ||
                    msg.videoMessage?.caption || ""
    if (caption) conteudo = caption
  }

  // Fallback: texto pode estar em Body, body, Text, text
  if (!conteudo && !mediaUrl) {
    conteudo = evt.Body || evt.body || evt.Text || evt.text || msg.Text || msg.text || ""
  }

  if (!chatId || !messageId) {
    console.warn("[Webhook] UazapiGO — faltam chatId ou messageId", { chatId, messageId })
    return null
  }

  return {
    id: messageId,
    chatId,
    fromMe: isFromMe,
    isGroup,
    numero: extrairNumero(chatId),
    tipo: tipoMsg,
    conteudo,
    mediaUrl,
    timestamp,
  }
}

// ── Normalizar payload Baileys/Evolution API (formato legado) ─────

function normalizarBaileys(payload: any): MensagemNormalizada[] {
  const messages = payload?.data?.messages
  if (!Array.isArray(messages)) return []

  return messages
    .filter((msg: any) => msg?.key && !msg.key.fromMe && !msg.key.remoteJid?.includes("@g.us"))
    .map((msg: any) => {
      const message = msg.message || {}
      let tipo: TipoMensagem = "texto"
      let mediaUrl: string | null = null

      if (message.audioMessage) { tipo = "audio"; mediaUrl = message.audioMessage.url || null }
      else if (message.imageMessage) { tipo = "imagem"; mediaUrl = message.imageMessage.url || null }
      else if (message.documentMessage) { tipo = "documento"; mediaUrl = message.documentMessage.url || null }
      else if (message.videoMessage) { tipo = "video"; mediaUrl = message.videoMessage.url || null }

      const conteudo =
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        ""

      return {
        id: msg.key.id,
        chatId: msg.key.remoteJid,
        fromMe: false,
        isGroup: false,
        numero: extrairNumero(msg.key.remoteJid),
        tipo,
        conteudo,
        mediaUrl,
        timestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000),
      }
    })
}

// ── Handler principal ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Validar origem: apenas se WEBHOOK_SECRET estiver explicitamente configurado
  const webhookSecret = process.env.WEBHOOK_SECRET
  if (webhookSecret) {
    const tokenRecebido =
      request.headers.get("x-webhook-token") ??
      request.headers.get("x-api-secret")
    if (tokenRecebido !== webhookSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
  }

  let payload: any

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  // Log completo do payload para diagnóstico
  console.log("[Webhook] Payload bruto:", JSON.stringify(payload).slice(0, 2000))

  // ── Detectar formato e normalizar ──
  let mensagens: MensagemNormalizada[] = []

  if (payload.event && typeof payload.event === "object") {
    // UazapiGO v2: { event: { Type, Chat, Message, ... } }
    const msg = normalizarUazapiV2(payload)
    if (msg) mensagens = [msg]
  } else if (typeof payload.event === "string") {
    // Baileys/Evolution: { event: "messages.upsert", data: { messages: [...] } }
    const eventosValidos = ["messages.upsert", "messages"]
    if (!eventosValidos.includes(payload.event)) {
      return NextResponse.json({ ok: true })
    }
    mensagens = normalizarBaileys(payload)
  } else {
    console.log("[Webhook] Formato não reconhecido — keys:", Object.keys(payload))
    return NextResponse.json({ ok: true })
  }

  if (mensagens.length === 0) {
    return NextResponse.json({ ok: true })
  }

  for (const msg of mensagens) {
    // Ignorar mensagens do próprio bot
    if (msg.fromMe) continue

    // Ignorar grupos
    if (msg.isGroup) continue

    // Dedup: verificar se já processou
    const existe = await prisma.mensagemWhatsapp.findUnique({
      where: { messageIdWhatsapp: msg.id },
    })
    if (existe) continue

    let conteudo = msg.conteudo
    let storedMediaUrl: string | null = null

    // Processar mídia
    try {
      if (msg.tipo === "audio" && msg.mediaUrl) {
        conteudo = `[Áudio transcrito]: ${await transcreverAudio(msg.mediaUrl)}`
      } else if (msg.tipo === "imagem" && msg.mediaUrl) {
        const descricao = await descreverImagem(msg.mediaUrl)
        conteudo = conteudo
          ? `${conteudo}\n[Imagem]: ${descricao}`
          : `[Imagem]: ${descricao}`
      }
    } catch {
      if (!conteudo) {
        conteudo = `[${msg.tipo} não processado]`
      }
    }

    // Download mídia e upload para Storage
    if (msg.mediaUrl && msg.tipo !== "texto") {
      storedMediaUrl = await downloadEUploadMidia(msg.mediaUrl, msg.tipo, msg.id)
    }

    // Encontrar ou criar lead pelo whatsapp
    let lead = await prisma.lead.findUnique({
      where: { whatsapp: msg.numero },
    })

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          nome: `WhatsApp ${msg.numero}`,
          whatsapp: msg.numero,
          origem: "whatsapp",
        },
      })
    }

    // Encontrar ou criar conversa
    let conversa = await prisma.conversa.findFirst({
      where: { leadId: lead.id },
      orderBy: { criadoEm: "desc" },
    })

    if (!conversa) {
      conversa = await prisma.conversa.create({
        data: { leadId: lead.id },
      })
    }

    // Salvar mensagem
    await prisma.mensagemWhatsapp.create({
      data: {
        conversaId: conversa.id,
        leadId: lead.id,
        messageIdWhatsapp: msg.id,
        tipo: msg.tipo,
        conteudo,
        remetente: "paciente",
        mediaUrl: storedMediaUrl,
        mediaType: msg.tipo !== "texto" ? msg.tipo : null,
      },
    })

    // Atualizar ultimaMensagemEm na conversa
    await prisma.conversa.update({
      where: { id: conversa.id },
      data: { ultimaMensagemEm: new Date() },
    })

    console.log("[Webhook] Mensagem processada", {
      leadId: lead.id,
      numero: msg.numero,
      tipo: msg.tipo,
      conteudo: conteudo.slice(0, 100),
    })

    // Adicionar ao buffer Redis + debounce
    try {
      await adicionarAoBuffer(msg.chatId, {
        tipo: msg.tipo,
        conteudo,
        timestamp: msg.timestamp,
        messageId: msg.id,
      })
      await agendarProcessamento(msg.chatId)

      // Agendar processamento após debounce (21s > 20s TTL)
      const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
      setTimeout(() => {
        fetch(`${baseUrl}/api/agente/processar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-secret": process.env.API_SECRET || "",
          },
          body: JSON.stringify({ chatId: msg.chatId }),
        }).catch(() => {
          // Ignorar erro de trigger — processamento pode ser feito por cron
        })
      }, 21000)
    } catch {
      // Redis não configurado — mensagem já salva no banco, ok
    }
  }

  return NextResponse.json({ ok: true })
}
