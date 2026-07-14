import { getSupabaseBrowser } from "@/lib/supabase-browser"

const BUCKET = "atendimento-midias"
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

const TIPOS_ACEITOS: Record<string, string> = {
  "image/jpeg": "imagem",
  "image/png": "imagem",
  "image/gif": "imagem",
  "image/webp": "imagem",
  "audio/mp3": "audio",
  "audio/mpeg": "audio",
  "audio/ogg": "audio",
  "audio/wav": "audio",
  "audio/webm": "audio",
  "application/pdf": "documento",
  "application/msword": "documento",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "documento",
  "application/vnd.ms-excel": "documento",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "documento",
  "video/mp4": "video",
  "video/webm": "video",
}

export function detectarTipoMidia(mimeType: string): string | null {
  return TIPOS_ACEITOS[mimeType] || null
}

export function validarArquivo(file: File): string | null {
  if (file.size > MAX_SIZE) return "Arquivo excede o limite de 20MB"
  if (!detectarTipoMidia(file.type)) return "Tipo de arquivo não suportado"
  return null
}

export async function uploadArquivo(
  conversaId: string,
  file: File,
  onProgresso?: (pct: number) => void
): Promise<{ url: string; tipo: string }> {
  const supabase = getSupabaseBrowser()
  const ext = file.name.split(".").pop() || "bin"
  const path = `${conversaId}/${Date.now()}.${ext}`

  // Upload com XHR para progresso (Supabase JS não suporta onUploadProgress nativamente)
  if (onProgresso) {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgresso(Math.round((e.loaded / e.total) * 100))
      })
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`Upload falhou: ${xhr.status}`))
      })
      xhr.addEventListener("error", () => reject(new Error("Erro no upload")))
      xhr.open("POST", url)
      xhr.setRequestHeader("Authorization", `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`)
      xhr.setRequestHeader("x-upsert", "true")
      xhr.send(file)
    })
  } else {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const tipo = detectarTipoMidia(file.type) || "documento"

  return { url: data.publicUrl, tipo }
}
