import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"
import { supabaseAdmin } from "@/lib/supabase"

type RouteParams = { params: Promise<{ id: string; docId: string }> }

const BUCKET = "documentos-prontuario"

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, docId } = await params

  const documento = await prisma.documentoProntuario.findFirst({
    where: {
      id: docId,
      prontuario: { paciente: { id, deletadoEm: null } },
    },
  })

  if (!documento) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  // Gerar signed URL com TTL de 5 minutos
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(documento.storagePath, 300) // 5 min

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Erro ao gerar URL de acesso" },
      { status: 500 }
    )
  }

  return NextResponse.json({ url: data.signedUrl, documento })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, docId } = await params

  const documento = await prisma.documentoProntuario.findFirst({
    where: {
      id: docId,
      prontuario: { paciente: { id, deletadoEm: null } },
    },
  })

  if (!documento) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  // Remover do Storage
  await supabaseAdmin.storage
    .from(BUCKET)
    .remove([documento.storagePath])

  // Remover do DB
  await prisma.documentoProntuario.delete({
    where: { id: docId },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "DocumentoProntuario",
    entidadeId: docId,
    dadosAntes: documento as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ sucesso: true })
}
