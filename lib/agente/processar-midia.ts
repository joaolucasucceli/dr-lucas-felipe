import { openai } from "@/lib/openai"

/** Transcreve áudio via OpenAI Whisper — aceita URL ou base64. */
export async function transcreverAudio(audioUrl: string): Promise<string> {
  const response = await fetch(audioUrl)
  if (!response.ok) {
    throw new Error(`Erro ao baixar áudio: ${response.status}`)
  }

  const blob = await response.blob()
  const file = new File([blob], "audio.ogg", { type: "audio/ogg" })

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "pt",
  })

  return transcription.text
}

/** Transcreve áudio a partir de base64 (fallback /message/download da Uazapi) */
export async function transcreverAudioBase64(
  base64: string,
  mimetype: string = "audio/ogg"
): Promise<string> {
  const buffer = Buffer.from(base64, "base64")
  const ext = mimetype.includes("mp3")
    ? "mp3"
    : mimetype.includes("wav")
      ? "wav"
      : "ogg"
  const file = new File([buffer], `audio.${ext}`, { type: mimetype })

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "pt",
  })

  return transcription.text
}

export type TipoFoto = "antes" | "depois" | "geral"

export interface AnaliseFoto {
  tipo: TipoFoto
  descricao: string
}

const PROMPT_VISAO = `Você é assistente de uma clínica de estética corporal. Analise a foto enviada por um paciente via WhatsApp.

Classifique em UMA das 3 categorias:
- "antes": foto do corpo/região SEM sinais de procedimento (típico de avaliação pré-operatória — pele sem curativos, sem marcas cirúrgicas, sem edema pós-op)
- "depois": foto COM sinais de procedimento recente (curativos, malha compressiva, marcas de incisão, edema visível, cinta cirúrgica, resultado imediato)
- "geral": foto que não se encaixa nas 2 acima (documento, selfie de rosto, região não-corporal, imagem ambígua)

Descreva em 1-3 frases a região visível e características relevantes (gordura localizada, flacidez, volume, proporção, curativos, resultado). NÃO faça diagnóstico médico — apenas descreva o visível. Seja profissional e respeitoso.

Retorne APENAS JSON válido neste formato:
{"tipo": "antes" | "depois" | "geral", "descricao": "..."}`

function parseAnalise(raw: string): AnaliseFoto {
  try {
    const parsed = JSON.parse(raw) as { tipo?: string; descricao?: string }
    const tipo: TipoFoto =
      parsed.tipo === "antes" || parsed.tipo === "depois" ? parsed.tipo : "geral"
    const descricao =
      typeof parsed.descricao === "string" && parsed.descricao.trim()
        ? parsed.descricao.trim()
        : "Imagem não descrita"
    return { tipo, descricao }
  } catch {
    return { tipo: "geral", descricao: raw.slice(0, 500) || "Imagem não descrita" }
  }
}

/** Analisa imagem via GPT-4o-mini (vision): retorna tipo + descrição. */
export async function analisarImagem(imagemUrl: string): Promise<AnaliseFoto> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT_VISAO },
          { type: "image_url", image_url: { url: imagemUrl } },
        ],
      },
    ],
    max_tokens: 400,
    response_format: { type: "json_object" },
  })

  return parseAnalise(completion.choices[0]?.message?.content || "")
}

/** Analisa imagem a partir de base64 (fallback /message/download da Uazapi) */
export async function analisarImagemBase64(
  base64: string,
  mimetype: string = "image/jpeg"
): Promise<AnaliseFoto> {
  const dataUrl = `data:${mimetype};base64,${base64}`
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT_VISAO },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: 400,
    response_format: { type: "json_object" },
  })

  return parseAnalise(completion.choices[0]?.message?.content || "")
}
