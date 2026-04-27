import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { TipoMensagem } from "@/lib/types/enums"
import { adicionarAoBuffer, deveProcessar } from "@/lib/agente/buffer"
import {
  transcreverAudio,
  transcreverAudioBase64,
} from "@/lib/agente/processar-midia"
import { baixarMidia, enviarDigitando } from "@/lib/uazapi"
import { criarId, agora } from "@/lib/db-utils"
import { BUCKET_FOTOS_CONTATO } from "@/lib/contatos/constantes"
import { obterOuCriarUsuarioIA } from "@/lib/agente/usuario-ia"

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

/** Garante string ao extrair texto de campos que podem vir como string ou objeto
 *  ({ text, caption, body, conversation }). Uazapi v2 mistura os dois formatos. */
function extrairTexto(raw: unknown): string {
  if (typeof raw === "string") return raw
  if (raw == null) return ""
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const candidato = obj.text ?? obj.caption ?? obj.body ?? obj.conversation
    if (typeof candidato === "string") return candidato
  }
  return ""
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

    // Imagens vao pro bucket dedicado de fotos do contato (mesmo bucket
    // usado pela aba "Fotos" do contato no painel). Demais tipos ficam
    // num bucket de midias gerais.
    const bucket = tipo === "imagem" ? BUCKET_FOTOS_CONTATO : "atendimento-midias"

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: MIME_MAP[tipo] || "application/octet-stream",
        upsert: true,
      })

    if (error) {
      console.error(`[webhook-whatsapp] upload em '${bucket}' falhou:`, error.message)
      return null
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error("[webhook-whatsapp] download/upload midia falhou:", err)
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

  // Uazapi v2 pode enviar content/body como string OU objeto estruturado
  // ({ text, caption, body, conversation }). Blindar pra sempre extrair string.
  const conteudo = extrairTexto(msg.content) || extrairTexto(msg.body) || ""

  const chat = payload.chat || {}
  const nomeContato =
    (typeof chat.name === "string" ? chat.name : null) ||
    (typeof chat.wa_name === "string" ? chat.wa_name : null) ||
    null

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
    if (msg.isGroup) continue

    // JLAU-584: fromMe = mensagens enviadas pela propria instancia.
    // Pode ser: (a) IA via registrar-mensagem; (b) atendente pelo WhatsApp pessoal da clinica
    // apos pausar a IA. Em (a) o dedup por messageIdWhatsapp (UNIQUE) protege duplicata.
    // Em (b) registramos como remetente "atendente" para aparecer no historico do contato.
    const ehAtendente = msg.fromMe === true

    const { data: existe } = await supabaseAdmin
      .from("mensagens_whatsapp")
      .select("id")
      .eq("messageIdWhatsapp", msg.id)
      .maybeSingle()

    if (existe) continue

    let conteudo = msg.conteudo
    let storedMediaUrl: string | null = null

    if (msg.tipo === "audio") {
      let transcricao: string | null = null

      if (msg.mediaUrl) {
        try {
          transcricao = await transcreverAudio(msg.mediaUrl)
        } catch (err) {
          console.error(
            `[Webhook] Falha via URL direta (audio):`,
            err instanceof Error ? err.message : err
          )
        }
      }

      if (!transcricao) {
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
              transcricao = await transcreverAudioBase64(
                baixado.base64,
                baixado.mimetype
              )
            }
          }
        } catch (err) {
          console.error(
            `[Webhook] Falha via /message/download (audio):`,
            err instanceof Error ? err.message : err
          )
        }
      }

      if (transcricao) {
        conteudo = `[Áudio transcrito]: ${transcricao}`
      } else {
        conteudo = conteudo
          ? `${conteudo}\n[áudio recebido — transcrição indisponível]`
          : "[áudio recebido — transcrição indisponível]"
      }
    } else if (msg.tipo === "imagem") {
      // JLAU-594: imagens vao direto pro atendimento, sem IA.
      // Caption do paciente vira o conteudo; se nao houver, marca "[Imagem]".
      if (!conteudo?.trim()) {
        conteudo = "[Imagem]"
      }
    }

    if (msg.mediaUrl && msg.tipo !== "texto") {
      storedMediaUrl = await downloadEUploadMidia(msg.mediaUrl, msg.tipo, msg.id)
    }

    const { data: contatoExistente } = await supabaseAdmin
      .from("contatos")
      .select("*")
      .eq("whatsapp", msg.numero)
      .maybeSingle()

    let contato = contatoExistente

    if (contato && contato.deletadoEm) {
      // JLAU-552: nao reativar contato soft-deletado. O DELETE ja hasheou o whatsapp,
      // entao na pratica essa query nao deveria encontrar o antigo — fallback defensivo.
      contato = null
    }

    if (!contato) {
      const usuarioIaId = await obterOuCriarUsuarioIA()

      const { data: novoContato, error: createErr } = await supabaseAdmin
        .from("contatos")
        .insert({
          id: criarId(),
          atualizadoEm: agora(),
          tipo: "lead",
          nome: msg.nomeContato?.trim() || `WhatsApp ${msg.numero}`,
          whatsapp: msg.numero,
          origem: "whatsapp",
          responsavelId: usuarioIaId,
        })
        .select("*")
        .single()

      if (createErr) {
        if (createErr.code === "23505") {
          const { data: paralelo } = await supabaseAdmin
            .from("contatos")
            .select("*")
            .eq("whatsapp", msg.numero)
            .maybeSingle()

          if (paralelo?.deletadoEm) {
            // JLAU-552: nao reativa — nao deveria acontecer apos hash do whatsapp.
            console.error(
              "[Webhook] Conflito inesperado: contato paralelo soft-deletado com whatsapp nao hasheado",
              { contatoId: paralelo.id, whatsapp: msg.numero }
            )
            continue
          } else {
            contato = paralelo
          }

          if (!contato) {
            console.error("[Webhook] Falha ao criar/encontrar contato após dup:", createErr.message)
            continue
          }
        } else {
          console.error("[Webhook] Falha ao criar contato:", createErr.message)
          continue
        }
      } else {
        contato = novoContato
      }
    }

    const { data: conversaExistente } = await supabaseAdmin
      .from("conversas")
      .select("*")
      .eq("contatoId", contato!.id)
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
          contatoId: contato!.id,
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
        contatoId: contato!.id,
        messageIdWhatsapp: msg.id,
        tipo: msg.tipo,
        conteudo,
        remetente: ehAtendente ? "atendente" : "paciente",
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

    // JLAU-584: mensagens do atendente nao disparam a IA e nao viram foto analisada.
    if (ehAtendente) continue

    if (msg.tipo === "imagem" && storedMediaUrl) {
      // JLAU-594: webhook anexa imagem direto, sem IA.
      // Descricao = caption do paciente (se houver); tipo classificavel manualmente depois.
      const captionPaciente = msg.conteudo?.trim() || null
      const { error: fotoErr } = await supabaseAdmin
        .from("fotos_contato")
        .insert({
          id: criarId(),
          contatoId: contato!.id,
          url: storedMediaUrl,
          categoria: "recebida_whatsapp",
          tipoAnalise: "geral",
          descricao: captionPaciente,
        })

      if (fotoErr) {
        console.error("[Webhook] Falha FotoContato:", fotoErr.message)
      }
    }

    try {
      await adicionarAoBuffer(msg.chatId, {
        tipo: msg.tipo,
        conteudo,
        timestamp: msg.timestamp,
        messageId: msg.id,
      })

      // JLAU-551: mostra "digitando" imediatamente ao receber a mensagem,
      // sem esperar os 20s de debounce. Cada mensagem nova renova o indicador.
      try {
        const { data: configPresence } = await supabaseAdmin
          .from("config_whatsapp")
          .select("uazapiUrl, instanceToken")
          .eq("ativo", true)
          .maybeSingle()
        if (configPresence?.uazapiUrl && configPresence?.instanceToken) {
          await enviarDigitando(
            configPresence.uazapiUrl,
            configPresence.instanceToken,
            msg.chatId,
            true
          )
        }
      } catch (err) {
        console.warn(
          "[Webhook] Falha ao disparar digitando imediato:",
          err instanceof Error ? err.message : err
        )
      }

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
        console.error("[webhook-whatsapp] erro ao acionar processar:", err)
      })
    } catch (err) {
      console.warn("[webhook-whatsapp] buffer/Redis indisponivel — msg salva no banco:", err)
    }
  }

  return NextResponse.json({ ok: true })
}
