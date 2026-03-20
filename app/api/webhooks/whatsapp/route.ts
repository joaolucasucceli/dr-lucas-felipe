import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { adicionarAoBuffer, agendarProcessamento } from "@/lib/agente/buffer"
import { transcreverAudio, descreverImagem } from "@/lib/agente/processar-midia"

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

function detectarTipo(message: UazapiMessage["message"]): string {
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

export async function POST(request: NextRequest) {
  let payload: UazapiPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  // Filtrar: apenas messages.upsert
  if (payload.event !== "messages.upsert") {
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
      },
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
    } catch {
      // Redis não configurado — mensagem já salva no banco, ok
    }
  }

  return NextResponse.json({ ok: true })
}
