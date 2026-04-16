import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { TipoMensagem } from "@/lib/types/enums"
import { adicionarAoBuffer, deveProcessar } from "@/lib/agente/buffer"
import {
  transcreverAudio,
  transcreverAudioBase64,
  analisarImagem,
  analisarImagemBase64,
  type AnaliseFoto,
} from "@/lib/agente/processar-midia"
import { baixarMidia } from "@/lib/uazapi"
import { criarId, agora } from "@/lib/db-utils"

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MensagemNormalizada {
  id: string
  chatId: string
  fromMe: boolean
  isGroup: boolean
  numero: string
  nomeContato: string | null
  tipo: TipoMensagem
  conteudo: string
  mediaUrl: string | null
  timestamp: number
}

function extrairNumero(jid: string): string {
  return jid.split("@")[0]
}

const MIME_MAP: Record<string, string> = {
  imagem: "image/jpeg",
  audio: "audio/ogg",
  documento: "application/octet-stream",
  video: "video/mp4",
  sticker: "image/webp",
}

async function downloadEUploadMidia(
  mediaUrl: string,
  tipo: TipoMensagem,
  messageId: string
): Promise<string | null> {
  try {
    const res = await fetch(mediaUrl)
    if (!res.ok) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    const ext =
      tipo === "imagem"
        ? "jpg"
        : tipo === "audio"
          ? "ogg"
          : tipo === "video"
            ? "mp4"
            : tipo === "sticker"
              ? "webp"
              : "bin"
    const path = `webhook/${messageId}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from("atendimento-midias")
      .upload(path, buffer, {
        contentType: MIME_MAP[tipo] || "application/octet-stream",
        upsert: true,
      })

    if (error) return null

    const { data } = supabaseAdmin.storage.from("atendimento-midias").getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

function normalizarUazapiV2(payload: any): MensagemNormalizada | null {
  const msg = payload.message
  if (!msg) return null

  const chatId = msg.chatid || ""
  const isFromMe = msg.fromMe ?? false
  const isGroup = msg.isGroup ?? chatId.includes("@g.us")
  const messageId = msg.id || ""
  const timestamp = msg.messageTimestamp
    ? Math.floor(typeof msg.messageTimestamp === "number" && msg.messageTimestamp > 1e12
        ? msg.messageTimestamp / 1000
        : msg.messageTimestamp)
    : Math.floor(Date.now() / 1000)

  const mediaType = (msg.mediaType || "").toLowerCase()
  let tipoMsg: TipoMensagem = "texto"
  const mediaUrl: string | null = msg.mediaUrl || msg.media_url || null

  if (mediaType.includes("sticker")) {
    tipoMsg = "sticker"
  } else if (mediaType.includes("audio") || mediaType === "ptt") {
    tipoMsg = "audio"
  } else if (mediaType.includes("image")) {
    tipoMsg = "imagem"
  } else if (mediaType.includes("document")) {
    tipoMsg = "documento"
  } else if (mediaType.includes("video")) {
    tipoMsg = "video"
  }

  const conteudo = msg.content || msg.body || ""

  const chat = payload.chat || {}
  const nomeContato = chat.name || chat.wa_name || null

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
    nomeContato,
    tipo: tipoMsg,
    conteudo,
    mediaUrl,
    timestamp,
  }
}

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
        nomeContato: null,
        tipo,
        conteudo,
        mediaUrl,
        timestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000),
      }
    })
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.WEBHOOK_SECRET
  if (webhookSecret) {
    const tokenRecebido =
      request.headers.get("x-webhook-token") ??
      request.headers.get("x-api-secret")
    if (tokenRecebido !== webhookSecret) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }
  }

  let payload: any

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  let mensagens: MensagemNormalizada[] = []

  if (payload.EventType === "messages" && payload.message) {
    const msg = normalizarUazapiV2(payload)
    if (msg) mensagens = [msg]
  } else if (typeof payload.event === "string") {
    const eventosValidos = ["messages.upsert", "messages"]
    if (!eventosValidos.includes(payload.event)) {
      return NextResponse.json({ ok: true })
    }
    mensagens = normalizarBaileys(payload)
  } else {
    console.error("[Webhook] Evento ignorado", {
      EventType: payload.EventType,
      event: payload.event,
    })
    return NextResponse.json({ ok: true })
  }

  if (mensagens.length === 0) {
    return NextResponse.json({ ok: true })
  }

  for (const msg of mensagens) {
    if (msg.fromMe) continue
    if (msg.isGroup) continue

    const { data: existe } = await supabaseAdmin
      .from("mensagens_whatsapp")
      .select("id")
      .eq("messageIdWhatsapp", msg.id)
      .maybeSingle()

    if (existe) continue

    let conteudo = msg.conteudo
    let storedMediaUrl: string | null = null
    let analiseFoto: AnaliseFoto | null = null

    if (msg.tipo === "audio" || msg.tipo === "imagem") {
      let transcricao: string | null = null

      if (msg.mediaUrl) {
        try {
          if (msg.tipo === "audio") {
            transcricao = await transcreverAudio(msg.mediaUrl)
          } else {
            analiseFoto = await analisarImagem(msg.mediaUrl)
          }
        } catch (err) {
          console.error(
            `[Webhook] Falha via URL direta (${msg.tipo}):`,
            err instanceof Error ? err.message : err
          )
        }
      }

      if (!transcricao && !analiseFoto) {
        try {
          const { data: configWa } = await supabaseAdmin
            .from("config_whatsapp")
            .select("uazapiUrl, instanceToken")
            .eq("ativo", true)
            .maybeSingle()

          if (configWa?.uazapiUrl && configWa?.instanceToken) {
            const baixado = await baixarMidia(
              configWa.uazapiUrl,
              configWa.instanceToken,
              msg.id
            )
            if (baixado) {
              if (msg.tipo === "audio") {
                transcricao = await transcreverAudioBase64(
                  baixado.base64,
                  baixado.mimetype
                )
              } else {
                analiseFoto = await analisarImagemBase64(
                  baixado.base64,
                  baixado.mimetype
                )
              }
            }
          }
        } catch (err) {
          console.error(
            `[Webhook] Falha via /message/download (${msg.tipo}):`,
            err instanceof Error ? err.message : err
          )
        }
      }

      if (msg.tipo === "audio") {
        if (transcricao) {
          conteudo = `[Áudio transcrito]: ${transcricao}`
        } else {
          conteudo = conteudo
            ? `${conteudo}\n[áudio recebido — transcrição indisponível]`
            : "[áudio recebido — transcrição indisponível]"
        }
      } else {
        if (analiseFoto) {
          conteudo = conteudo
            ? `${conteudo}\n[Imagem]: ${analiseFoto.descricao}`
            : `[Imagem]: ${analiseFoto.descricao}`
        } else {
          conteudo = conteudo
            ? `${conteudo}\n[imagem recebida — descrição indisponível]`
            : "[imagem recebida — descrição indisponível]"
        }
      }
    }

    if (msg.mediaUrl && msg.tipo !== "texto") {
      storedMediaUrl = await downloadEUploadMidia(msg.mediaUrl, msg.tipo, msg.id)
    }

    const { data: leadExistente } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("whatsapp", msg.numero)
      .maybeSingle()

    let lead = leadExistente

    if (lead && lead.deletadoEm) {
      const { data: reativado } = await supabaseAdmin
        .from("leads")
        .update({
          deletadoEm: null,
          nome: msg.nomeContato?.trim() || lead.nome,
          atualizadoEm: agora(),
        })
        .eq("id", lead.id)
        .select("*")
        .single()
      lead = reativado
    }

    if (!lead) {
      const { data: usuarioIa } = await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("tipo", "ia")
        .eq("ativo", true)
        .is("deletadoEm", null)
        .maybeSingle()

      if (!usuarioIa) {
        console.warn("[Webhook] Nenhum usuário IA ativo encontrado — lead será criado sem responsável")
      }

      const { data: novoLead, error: createErr } = await supabaseAdmin
        .from("leads")
        .insert({
          id: criarId(),
          atualizadoEm: agora(),
          nome: msg.nomeContato?.trim() || `WhatsApp ${msg.numero}`,
          whatsapp: msg.numero,
          origem: "whatsapp",
          responsavelId: usuarioIa?.id || null,
        })
        .select("*")
        .single()

      if (createErr) {
        if (createErr.code === "23505") {
          const { data: paralelo } = await supabaseAdmin
            .from("leads")
            .select("*")
            .eq("whatsapp", msg.numero)
            .maybeSingle()

          if (paralelo?.deletadoEm) {
            const { data: reativado } = await supabaseAdmin
              .from("leads")
              .update({
                deletadoEm: null,
                nome: msg.nomeContato?.trim() || paralelo.nome,
                atualizadoEm: agora(),
              })
              .eq("id", paralelo.id)
              .select("*")
              .single()
            lead = reativado
          } else {
            lead = paralelo
          }

          if (!lead) {
            console.error("[Webhook] Falha ao criar/encontrar lead após dup:", createErr.message)
            continue
          }
        } else {
          console.error("[Webhook] Falha ao criar lead:", createErr.message)
          continue
        }
      } else {
        lead = novoLead
      }
    }

    const { data: conversaExistente } = await supabaseAdmin
      .from("conversas")
      .select("*")
      .eq("leadId", lead!.id)
      .order("criadoEm", { ascending: false })
      .limit(1)
      .maybeSingle()

    let conversa = conversaExistente

    if (!conversa) {
      const { data: novaConversa, error: convErr } = await supabaseAdmin
        .from("conversas")
        .insert({
          id: criarId(),
          atualizadoEm: agora(),
          leadId: lead!.id,
        })
        .select("*")
        .single()

      if (convErr) {
        console.error("[Webhook] Falha ao criar conversa:", convErr.message)
        continue
      }
      conversa = novaConversa
    }

    const { error: msgErr } = await supabaseAdmin
      .from("mensagens_whatsapp")
      .insert({
        id: criarId(),
        conversaId: conversa!.id,
        leadId: lead!.id,
        messageIdWhatsapp: msg.id,
        tipo: msg.tipo,
        conteudo,
        remetente: "paciente",
        mediaUrl: storedMediaUrl,
        mediaType: msg.tipo !== "texto" ? msg.tipo : null,
      })

    if (msgErr) {
      if (msgErr.code === "23505") continue
      console.error("[Webhook] Falha ao salvar mensagem:", msgErr.message)
      continue
    }

    await supabaseAdmin
      .from("conversas")
      .update({ ultimaMensagemEm: agora(), atualizadoEm: agora() })
      .eq("id", conversa!.id)

    if (msg.tipo === "imagem" && storedMediaUrl) {
      const { error: fotoErr } = await supabaseAdmin
        .from("fotos_lead")
        .insert({
          id: criarId(),
          leadId: lead!.id,
          url: storedMediaUrl,
          tipoAnalise: analiseFoto?.tipo ?? "geral",
          descricao: analiseFoto?.descricao ?? null,
        })

      if (fotoErr) {
        console.error("[Webhook] Falha FotoLead:", fotoErr.message)
      }
    }

    try {
      await adicionarAoBuffer(msg.chatId, {
        tipo: msg.tipo,
        conteudo,
        timestamp: msg.timestamp,
        messageId: msg.id,
      })

      const podeDisparar = await deveProcessar(msg.chatId)
      if (!podeDisparar) {
        console.error("[Webhook] Debounce ativo — nao disparando /processar")
        continue
      }

      const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
      await fetch(`${baseUrl}/api/agente/processar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-secret": process.env.API_SECRET || "",
        },
        body: JSON.stringify({ chatId: msg.chatId }),
      }).catch((err) => {
        console.error("[Webhook] Erro ao acionar processar:", err)
      })
    } catch {
      // Redis não configurado — mensagem já salva no banco, ok
    }
  }

  return NextResponse.json({ ok: true })
}
