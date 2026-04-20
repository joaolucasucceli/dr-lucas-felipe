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
