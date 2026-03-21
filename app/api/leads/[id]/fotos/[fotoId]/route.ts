import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase"

type RouteParams = { params: Promise<{ id: string; fotoId: string }> }

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, fotoId } = await params

  const foto = await prisma.fotoLead.findFirst({
    where: { id: fotoId, leadId: id },
  })

  if (!foto) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 })
  }

  // Extrair path do Storage a partir da URL
  const urlParts = foto.url.split("/fotos-leads/")
  if (urlParts.length > 1) {
    const storagePath = urlParts[1]
    await supabaseAdmin.storage.from("fotos-leads").remove([storagePath])
  }

  await prisma.fotoLead.delete({ where: { id: fotoId } })

  return NextResponse.json({ mensagem: "Foto removida" })
}
