import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string; fotoId: string }> }

const BUCKET = "fotos-prontuario"

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, fotoId } = await params

  const { data: paciente } = await supabaseAdmin
    .from("pacientes")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select("id")
    .eq("pacienteId", id)
    .maybeSingle()

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const { data: foto } = await supabaseAdmin
    .from("fotos_prontuario")
    .select("*")
    .eq("id", fotoId)
    .eq("prontuarioId", prontuario.id)
    .maybeSingle()

  if (!foto) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 })
  }

  const url = new URL(foto.url)
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/fotos-prontuario\/(.+)/)
  if (pathMatch?.[1]) {
    await supabaseAdmin.storage
      .from(BUCKET)
      .remove([decodeURIComponent(pathMatch[1])])
  }

  const { error } = await supabaseAdmin
    .from("fotos_prontuario")
    .delete()
    .eq("id", fotoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "FotoProntuario",
    entidadeId: fotoId,
    dadosAntes: foto as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ sucesso: true })
}
