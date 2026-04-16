import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { createClient } from "@supabase/supabase-js"

const BUCKET = "atendimento-midias"
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Storage não configurado" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const ext = file.name.split(".").pop() || "jpg"
  const path = `usuarios/${session!.user.id}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error("[foto] Upload falhou:", uploadError.message)
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 })
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const fotoUrl = `${data.publicUrl}?t=${Date.now()}`

  await prisma.usuario.update({
    where: { id: session!.user.id },
    data: { fotoUrl },
  })

  return NextResponse.json({ fotoUrl })
}
