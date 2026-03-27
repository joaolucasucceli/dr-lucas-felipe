import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"
import { supabaseAdmin } from "@/lib/supabase"

type RouteParams = { params: Promise<{ id: string; fotoId: string }> }

const BUCKET = "fotos-prontuario"

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, fotoId } = await params

  const foto = await prisma.fotoProntuario.findFirst({
    where: {
      id: fotoId,
      prontuario: { paciente: { id, deletadoEm: null } },
    },
  })

  if (!foto) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 })
  }

  // Extrair path do storage a partir da URL pública
  const url = new URL(foto.url)
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/fotos-prontuario\/(.+)/)
  if (pathMatch?.[1]) {
    await supabaseAdmin.storage
      .from(BUCKET)
      .remove([decodeURIComponent(pathMatch[1])])
  }

  await prisma.fotoProntuario.delete({
    where: { id: fotoId },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "FotoProntuario",
    entidadeId: fotoId,
    dadosAntes: foto as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ sucesso: true })
}
