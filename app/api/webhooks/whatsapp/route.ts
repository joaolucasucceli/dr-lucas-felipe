import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { env, getBaseUrl, isProd } from "@/lib/env"
import type { TipoMensagem } from "@/lib/types/enums"
import { adicionarAoBuffer, deveProcessar } from "@/lib/agente/buffer"
import {
  checkRateLimitWhatsappWebhook,
  registrarTentativaWhatsappWebhook,
} from "@/lib/rate-limit"
import {
  transcreverAudio,
  transcreverAudioBase64,
} from "@/lib/agente/processar-midia"
import { baixarMidia, enviarDigitando } from "@/lib/uazapi"
import { criarId, agora } from "@/lib/db-utils"
import { BUCKET_FOTOS_CONTATO } from "@/lib/contatos/constantes"
import { processarRespostaDrLucas } from "@/lib/orcamento/processar-resposta-dr-lucas"

// @react-pdf/renderer (usado pela ingestao do orcamento do Dr. Lucas) exige
// runtime Node — nunca edge. App Router ja usa Node por padrao, mas fixamos
// explicitamente pra blindar contra mudanca futura de config.
export const runtime = "nodejs"

/* eslint-disable @typescript-eslint/no-explicit-any */

/** So digitos — usado pra comparar numeros de WhatsApp. */
function apenasDigitos(s: string): string {
  return (s ?? "").replace(/\D+/g, "")
}

/** Normaliza um numero BR pra "DDD + 8 digitos locais" (10 digitos), removendo
 *  o codigo do pais (55) e o nono digito opcional do celular. Resolve a
 *  ambiguidade do nono digito: `5545991237219` e `554591237219` viram o mesmo
 *  `4591237219`. Usado pra reconhecer o Dr. Lucas independente do formato. */
function normalizarNumeroBR(s: string): string {
  let d = apenasDigitos(s)
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2) // tira o pais
  // Agora d = DDD(2) + local. Se local tem 9 digitos e comeca com 9, tira o 9.
  if (d.length === 11 && d[2] === "9") d = d.slice(0, 2) + d.slice(3)
  return d.slice(-10) // DDD + 8 (estavel)
}

/** Compara dois numeros BR tolerando o nono digito e o codigo do pais. */
function mesmoNumeroBR(a: string, b: string): boolean {
  const na = normalizarNumeroBR(a)
  const nb = normalizarNumeroBR(b)
  return na.length >= 10 && na === nb
}

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
  mediaUrl: string | null,
  tipo: TipoMensagem,
  messageId: string,
  configWa: { uazapiUrl?: string | null; instanceToken?: string | null } | null
): Promise<string | null> {
  try {
    let buffer: Buffer | null = null
    let mimetypeDetectado: string | null = null

    // 1. Tenta URL direta (Uazapi v1 padrao ou link publico). Pode falhar
    // com 401/403/404 quando a Uazapi exige token.
    if (mediaUrl) {
      try {
        const res = await fetch(mediaUrl)
        if (res.ok) {
          buffer = Buffer.from(await res.arrayBuffer())
        }
      } catch {
        // segue pro fallback
      }
    }

    // 2. Fallback Uazapi v2: POST /message/download via baixarMidia.
    // Necessario porque a v2 nao manda mediaUrl publica no payload do
    // webhook — exige chamada explicita pra obter base64.
    if (!buffer && configWa?.uazapiUrl && configWa?.instanceToken) {
      const baixado = await baixarMidia(
        configWa.uazapiUrl,
        configWa.instanceToken,
        messageId
      )
      if (baixado?.base64) {
        buffer = Buffer.from(baixado.base64, "base64")
        mimetypeDetectado = baixado.mimetype
      }
    }

    if (!buffer) {
      console.warn(`[webhook-whatsapp] sem buffer pra midia ${messageId} (tipo ${tipo})`)
      return null
    }

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
    const contentType = mimetypeDetectado || MIME_MAP[tipo] || "application/octet-stream"

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true })

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
  let payload: any

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  // WEBHOOK_SECRET obrigatorio em producao (2026-05-13). Em dev sem secret
  // configurado, mantem a porta aberta pra facilitar testes locais.
  if (env.WEBHOOK_SECRET) {
    // Diagnostico 2026-05-13: Uazapi envia o `instanceToken` no body.token
    // (nao um secret separado). Aceitamos qualquer dos lugares de auth
    // tradicionais, MAIS o instanceToken da config_whatsapp ativa.
    const url = new URL(request.url)
    const tokenRecebido =
      request.headers.get("x-webhook-token") ??
      request.headers.get("x-api-secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      request.headers.get("apikey") ??
      request.headers.get("token") ??
      url.searchParams.get("token") ??
      url.searchParams.get("webhook_token") ??
      url.searchParams.get("secret") ??
      (typeof payload === "object" && payload !== null
        ? payload.token ?? payload.webhook_token ?? payload.secret
        : null)

    // Caminho A: bate com WEBHOOK_SECRET (curl/testes manuais)
    let autorizado = tokenRecebido === env.WEBHOOK_SECRET

    // Caminho B: bate com instanceToken ativo na config_whatsapp (caminho
    // real da Uazapi — ela manda o proprio token da instancia no body)
    if (!autorizado && tokenRecebido) {
      const { data: cfg } = await supabaseAdmin
        .from("config_whatsapp")
        .select("instanceToken")
        .eq("ativo", true)
      const tokensValidos = (cfg ?? [])
        .map((c) => c.instanceToken)
        .filter(Boolean)
      autorizado = tokensValidos.some((t) => t === tokenRecebido)
    }

    if (!autorizado) {
      // LOG TEMPORARIO 2026-05-13 — pra descobrir onde a Uazapi manda o token.
      const tokenBody =
        typeof payload === "object" && payload !== null
          ? payload.token ?? payload.webhook_token ?? payload.secret
          : null
      console.error(
        "[webhook-auth] 401 —",
        "esperado:",
        env.WEBHOOK_SECRET?.slice(0, 8) + "...(+" + (env.WEBHOOK_SECRET?.length ?? 0) + ")",
        "| body.token:",
        tokenBody ? String(tokenBody).slice(0, 8) + "...(+" + String(tokenBody).length + ")" : "null",
        "| keys:",
        typeof payload === "object" && payload !== null
          ? Object.keys(payload).join(",")
          : typeof payload,
      )
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }
  } else if (isProd) {
    // Producao chegou aqui SEM secret = falha grave de config. Bloqueia.
    console.error(
      "[webhook-whatsapp] PRODUCAO sem WEBHOOK_SECRET — bloqueando payload " +
        "por seguranca. Configure a env no Vercel + header no Uazapi."
    )
    return NextResponse.json(
      { error: "Servico mal configurado" },
      { status: 503 },
    )
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

  // Carrega config WhatsApp UMA VEZ pra todo o batch — antes lia 3x por
  // mensagem (transcrever audio + baixar midia + enviar digitando).
  // -150-300ms por mensagem, principalmente sob rajada.
  const { data: configWaBatch } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .maybeSingle()

  // Numero pessoal do Dr. Lucas (so digitos). Quando ele responde o orcamento
  // (`<numero> - <valor>`) pro numero da clinica, essa mensagem chega como
  // ENTRANTE (fromMe=false) com msg.numero === DR_LUCAS_WHATSAPP_PESSOAL.
  const numeroDrLucas = apenasDigitos(process.env.DR_LUCAS_WHATSAPP_PESSOAL ?? "")

  for (const msg of mensagens) {
    if (msg.isGroup) continue

    // ── Interceptador da resposta de orcamento do Dr. Lucas ──────────────
    // RODA ANTES de qualquer lookup/criacao de contato — senao o sistema
    // criaria um "lead" pro proprio Dr. Lucas. Detecta msg ENTRANTE vinda do
    // numero pessoal dele e trata como ingestao de orcamento (parse numero +
    // valor -> gera PDF -> envia pra cliente -> retoma). Defensivo: nunca
    // lanca; em qualquer caso de msg do Dr. Lucas, faz `continue` (a msg dele
    // NUNCA roda o loop da IA nem vira paciente).
    if (
      numeroDrLucas &&
      !msg.fromMe &&
      mesmoNumeroBR(msg.numero, numeroDrLucas)
    ) {
      try {
        await processarRespostaDrLucas({
          textoMensagem: msg.conteudo ?? "",
          numeroDrLucas,
          configWa: configWaBatch,
        })
      } catch (err) {
        console.error(
          "[webhook-whatsapp] interceptador orcamento Dr. Lucas falhou:",
          err
        )
      }
      continue
    }

    // Rate limit por numero do remetente. Paciente real fica bem abaixo dos
    // 30/min; quem ultrapassa e bot ou abuso (cada msg vira call OpenAI).
    // Mensagem ainda salva no banco (barato) mas NAO dispara /processar.
    let bloqueadoPorRate = false
    if (!msg.fromMe) {
      const rl = await checkRateLimitWhatsappWebhook(msg.numero)
      if (rl.bloqueado) {
        console.warn(
          `[webhook-whatsapp] rate-limit estourado pelo numero ${msg.numero} (${rl.tentativas} msgs/60s) — pulando /processar`
        )
        bloqueadoPorRate = true
      } else {
        await registrarTentativaWhatsappWebhook(msg.numero)
      }
    }

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
          if (configWaBatch?.uazapiUrl && configWaBatch?.instanceToken) {
            const baixado = await baixarMidia(
              configWaBatch.uazapiUrl,
              configWaBatch.instanceToken,
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

    if (msg.tipo !== "texto") {
      storedMediaUrl = await downloadEUploadMidia(
        msg.mediaUrl,
        msg.tipo,
        msg.id,
        configWaBatch
      )
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
      const { data: novoContato, error: createErr } = await supabaseAdmin
        .from("contatos")
        .insert({
          id: criarId(),
          atualizadoEm: agora(),
          tipo: "lead",
          nome: msg.nomeContato?.trim() || `WhatsApp ${msg.numero}`,
          whatsapp: msg.numero,
          origem: "whatsapp",
          statusFunil: "acolhimento",
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

    // Handoff humano: Dr. Lucas respondeu via WhatsApp dele (fromMe=true) num
    // chat com paciente que estava aguardando orcamento manual. Zera o flag
    // e marca o evento como respondido — proxima mensagem do paciente volta
    // a acionar a IA normalmente.
    if (
      ehAtendente &&
      (contato as { aguardandoOrcamentoHumano?: boolean })?.aguardandoOrcamentoHumano
    ) {
      try {
        await Promise.all([
          supabaseAdmin
            .from("contatos")
            .update({
              aguardandoOrcamentoHumano: false,
              aguardandoOrcamentoDesde: null,
              atualizadoEm: agora(),
            })
            .eq("id", contato!.id),
          supabaseAdmin
            .from("eventos_orcamento_pendente")
            .update({ respondidoEm: agora() })
            .eq("contatoId", contato!.id)
            .is("respondidoEm", null)
            .is("canceladoEm", null),
        ])
        console.log(
          `[Webhook] Dr. Lucas respondeu orcamento manual — handoff fechado pra contato ${contato!.id}`
        )
      } catch (err) {
        console.error("[Webhook] Falha ao fechar handoff manual:", err)
      }
    }

    // JLAU-584: mensagens do atendente nao disparam a IA e nao viram foto analisada.
    // Rate limit estourado tambem entra aqui (mensagem fica no historico, mas IA nao roda).
    if (ehAtendente || bloqueadoPorRate) continue

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
        if (configWaBatch?.uazapiUrl && configWaBatch?.instanceToken) {
          await enviarDigitando(
            configWaBatch.uazapiUrl,
            configWaBatch.instanceToken,
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

      const baseUrl = getBaseUrl()
      await fetch(`${baseUrl}/api/agente/processar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-secret": env.API_SECRET,
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
