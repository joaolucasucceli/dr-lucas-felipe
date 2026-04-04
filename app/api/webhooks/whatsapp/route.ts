import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { TipoMensagem } from "@/generated/prisma/enums"
import { adicionarAoBuffer, agendarProcessamento } from "@/lib/agente/buffer"
import { transcreverAudio, descreverImagem } from "@/lib/agente/processar-midia"
import { createClient } from "@supabase/supabase-js"

interface UazapiMessage {
  key: {
    id: string
    remoteJid: string
    fromMe: boolean
  }
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { url?: string; caption?: string }
    audioMessage?: { url?: string }
    documentMessage?: { url?: string; fileName?: string }
    videoMessage?: { url?: string; caption?: string }
  }
  messageTimestamp?: number
}

interface UazapiPayload {
  event: string
  data?: {
    messages?: UazapiMessage[]
  }
}

function extrairNumero(remoteJid: string): string {
  return remoteJid.split("@")[0]
}

function detectarTipo(message: UazapiMessage["message"]): TipoMensagem {
  if (!message) return "texto"
  if (message.audioMessage) return "audio"
  if (message.imageMessage) return "imagem"
  if (message.documentMessage) return "documento"
  if (message.videoMessage) return "video"
  return "texto"
}

function extrairTexto(message: UazapiMessage["message"]): string {
  if (!message) return ""
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ""
  )
}

function extrairMediaUrl(message: UazapiMessage["message"]): string | null {
  if (!message) return null
  return (
    message.audioMessage?.url ||
    message.imageMessage?.url ||
    message.documentMessage?.url ||
    message.videoMessage?.url ||
    null
  )
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

export async function POST(request: NextRequest) {
  console.log("[Webhook] Requisição recebida", {
    headers: {
      "x-webhook-token": request.headers.get("x-webhook-token"),
      "x-api-secret": request.headers.get("x-api-secret"),
      "content-type": request.headers.get("content-type"),
    },
  })

  // Validar origem: aceitar apenas se WEBHOOK_SECRET estiver configurado e coincidir
  const webhookSecret = process.env.WEBHOOK_SECRET || process.env.API_SECRET
  if (webhookSecret) {
    const tokenRecebido =
      request.headers.get("x-webhook-token") ??
      request.headers.get("x-api-secret")
    if (tokenRecebido !== webhookSecret) {
      console.warn("[Webhook] 401 — token inválido ou ausente", { tokenRecebido })
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
  }

  let payload: UazapiPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  console.log("[Webhook] Payload recebido", {
    event: payload.event,
    dataKeys: payload.data ? Object.keys(payload.data) : [],
    messagesCount: payload.data?.messages?.length ?? 0,
  })

  // Filtrar: apenas messages.upsert ou messages
  const eventosValidos = ["messages.upsert", "messages"]
  if (!eventosValidos.includes(payload.event)) {
    return NextResponse.json({ ok: true })
  }

  const messages = payload.data?.messages
  if (!messages || messages.length === 0) {
    return NextResponse.json({ ok: true })
  }

  for (const msg of messages) {
    // Ignorar mensagens do próprio bot
    if (msg.key.fromMe) continue

    // Ignorar grupos
    if (msg.key.remoteJid.includes("@g.us")) continue

    // Dedup: verificar se já processou
    const existe = await prisma.mensagemWhatsapp.findUnique({
      where: { messageIdWhatsapp: msg.key.id },
    })
    if (existe) continue

    const numero = extrairNumero(msg.key.remoteJid)
    const tipo = detectarTipo(msg.message)
    let conteudo = extrairTexto(msg.message)
    const mediaUrl = extrairMediaUrl(msg.message)

    // Processar mídia
    let storedMediaUrl: string | null = null
    try {
      if (tipo === "audio" && mediaUrl) {
        conteudo = `[Áudio transcrito]: ${await transcreverAudio(mediaUrl)}`
      } else if (tipo === "imagem" && mediaUrl) {
        const descricao = await descreverImagem(mediaUrl)
        conteudo = conteudo
          ? `${conteudo}\n[Imagem]: ${descricao}`
          : `[Imagem]: ${descricao}`
      }
    } catch {
      // Se falhar processamento de mídia, salvar o que temos
      if (!conteudo) {
        conteudo = `[${tipo} não processado]`
      }
    }

    // Download mídia e upload para Storage
    if (mediaUrl && tipo !== "texto") {
      storedMediaUrl = await downloadEUploadMidia(mediaUrl, tipo, msg.key.id)
    }

    // Encontrar ou criar lead pelo whatsapp
    let lead = await prisma.lead.findUnique({
      where: { whatsapp: numero },
    })

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          nome: `WhatsApp ${numero}`,
          whatsapp: numero,
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
        messageIdWhatsapp: msg.key.id,
        tipo,
        conteudo,
        remetente: "paciente",
        mediaUrl: storedMediaUrl,
        mediaType: tipo !== "texto" ? tipo : null,
      },
    })

    // Atualizar ultimaMensagemEm na conversa
    await prisma.conversa.update({
      where: { id: conversa.id },
      data: { ultimaMensagemEm: new Date() },
    })

    // Adicionar ao buffer Redis + debounce
    const chatId = msg.key.remoteJid
    try {
      await adicionarAoBuffer(chatId, {
        tipo,
        conteudo,
        timestamp: msg.messageTimestamp || Date.now(),
        messageId: msg.key.id,
      })
      await agendarProcessamento(chatId)

      // Agendar processamento após debounce (21s > 20s TTL)
      const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
      setTimeout(() => {
        fetch(`${baseUrl}/api/agente/processar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-secret": process.env.API_SECRET || "",
          },
          body: JSON.stringify({ chatId }),
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
