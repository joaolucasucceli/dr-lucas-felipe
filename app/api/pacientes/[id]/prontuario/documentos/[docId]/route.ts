import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string; docId: string }> }

const BUCKET = "documentos-prontuario"

async function buscarDocumento(pacienteId: string, docId: string) {
  const { data: paciente } = await supabaseAdmin
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente) return null

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select("id")
    .eq("pacienteId", pacienteId)
    .maybeSingle()

  if (!prontuario) return null

  const { data: documento } = await supabaseAdmin
    .from("documentos_prontuario")
    .select("*")
    .eq("id", docId)
    .eq("prontuarioId", prontuario.id)
    .maybeSingle()

  return documento
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, docId } = await params

  const documento = await buscarDocumento(id, docId)
  if (!documento) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(documento.storagePath, 300)

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

  const documento = await buscarDocumento(id, docId)
  if (!documento) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  }

  await supabaseAdmin.storage
    .from(BUCKET)
    .remove([documento.storagePath])

  const { error } = await supabaseAdmin
    .from("documentos_prontuario")
    .delete()
    .eq("id", docId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "DocumentoProntuario",
    entidadeId: docId,
    dadosAntes: documento as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ sucesso: true })
}
