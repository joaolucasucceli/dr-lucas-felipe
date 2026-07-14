import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

const BUCKET = "atendimento-midias"
const PASTA = "midia-marketing"
const TAMANHO_MAX = 20 * 1024 * 1024 // 20 MB

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 })
  }

  const arquivo = formData.get("arquivo") as File | null
  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 })
  }

  if (arquivo.size > TAMANHO_MAX) {
    return NextResponse.json(
      { error: "Arquivo excede 20MB" },
      { status: 400 }
    )
  }

  const ext = (arquivo.name.split(".").pop() || "bin").toLowerCase()
  const path = `${PASTA}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await arquivo.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: arquivo.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    console.error("[midia-marketing.upload] falha:", uploadError.message)
    return NextResponse.json(
      { error: `Falha no upload: ${uploadError.message}` },
      { status: 500 }
    )
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: data.publicUrl })
}
