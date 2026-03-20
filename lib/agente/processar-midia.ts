import { openai } from "@/lib/openai"

/** Transcreve áudio via OpenAI Whisper */
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

/** Descreve imagem via GPT-4o-mini (vision) */
export async function descreverImagem(imagemUrl: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Descreva esta imagem de forma concisa em português. Se for uma foto médica ou de procedimento estético, descreva o que é visível.",
          },
          {
            type: "image_url",
            image_url: { url: imagemUrl },
          },
        ],
      },
    ],
    max_tokens: 300,
  })

  return completion.choices[0]?.message?.content || "Imagem não descrita"
}
