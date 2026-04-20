import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

type RouteParams = { params: Promise<{ id: string; fotoId: string }> }

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, fotoId } = await params

  const { data: foto } = await supabaseAdmin
    .from("fotos_contato")
    .select("id, url")
    .eq("id", fotoId)
    .eq("contatoId", id)
    .maybeSingle()

  if (!foto) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 })
  }

  const urlParts = foto.url.split("/fotos-leads/")
  if (urlParts.length > 1) {
    const storagePath = urlParts[1]
    await supabaseAdmin.storage.from("fotos-leads").remove([storagePath])
  }

  const { error } = await supabaseAdmin
    .from("fotos_contato")
    .delete()
    .eq("id", fotoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mensagem: "Foto removida" })
}
