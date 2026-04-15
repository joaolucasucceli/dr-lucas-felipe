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

const PROMPT_VISAO =
  "Você é assistente de uma clínica de estética corporal. Analise esta foto enviada por um paciente. Se for foto do corpo ou região de interesse: descreva a região visível e características relevantes para procedimentos estéticos (gordura localizada, flacidez, volume, proporção). NÃO faça diagnóstico médico — apenas descreva o que é visível. Seja profissional e respeitoso. Se for foto não relacionada (documento, selfie casual, etc): descreva brevemente o que é. Responda em português, máximo 3 frases."

/** Descreve imagem via GPT-4o-mini (vision) — aceita URL. */
export async function descreverImagem(imagemUrl: string): Promise<string> {
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
    max_tokens: 300,
  })

  return completion.choices[0]?.message?.content || "Imagem não descrita"
}

/** Descreve imagem a partir de base64 (fallback /message/download da Uazapi) */
export async function descreverImagemBase64(
  base64: string,
  mimetype: string = "image/jpeg"
): Promise<string> {
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
    max_tokens: 300,
  })

  return completion.choices[0]?.message?.content || "Imagem não descrita"
}
