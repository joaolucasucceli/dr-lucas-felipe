import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string; sinalId: string }> }

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, sinalId } = await params

  const { data: paciente } = await supabaseAdmin
    .from("contatos")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
  }

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select("id")
    .eq("contatoId", id)
    .maybeSingle()

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const { data: sinal } = await supabaseAdmin
    .from("sinais_vitais")
    .select("*")
    .eq("id", sinalId)
    .eq("prontuarioId", prontuario.id)
    .maybeSingle()

  if (!sinal) {
    return NextResponse.json({ error: "Sinal vital não encontrado" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("sinais_vitais")
    .delete()
    .eq("id", sinalId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "SinalVital",
    entidadeId: sinalId,
    dadosAntes: sinal as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ sucesso: true })
}
