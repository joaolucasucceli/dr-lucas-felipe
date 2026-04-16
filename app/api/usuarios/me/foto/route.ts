import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { agora } from "@/lib/db-utils"

const BUCKET = "atendimento-midias"
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const formData = await request.formData()
  const file = formData.get("foto") as File | null

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo excede 5MB" }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Apenas imagens são aceitas" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() || "jpg"
  const path = `usuarios/${session!.user.id}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error("[foto] Upload falhou:", uploadError.message)
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  const fotoUrl = `${data.publicUrl}?t=${Date.now()}`

  await supabaseAdmin
    .from("usuarios")
    .update({ fotoUrl, atualizadoEm: agora() })
    .eq("id", session!.user.id)

  return NextResponse.json({ fotoUrl })
}
