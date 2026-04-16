import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const { data: existente } = await supabaseAdmin
    .from("tipos_procedimento")
    .select("id, nome")
    .eq("id", id)
    .maybeSingle()

  if (!existente) {
    return NextResponse.json({ error: "Tipo não encontrado" }, { status: 404 })
  }

  const data: { nome?: string; ativo?: boolean } = {}

  if (typeof body.nome === "string") {
    const nome = body.nome.trim()
    if (nome.length < 2) {
      return NextResponse.json({ error: "Nome deve ter pelo menos 2 caracteres" }, { status: 400 })
    }
    if (nome !== existente.nome) {
      const { data: duplicado } = await supabaseAdmin
        .from("tipos_procedimento")
        .select("id")
        .eq("nome", nome)
        .maybeSingle()

      if (duplicado) {
        return NextResponse.json({ error: "Já existe um tipo com esse nome" }, { status: 409 })
      }
    }
    data.nome = nome
  }

  if (typeof body.ativo === "boolean") {
    data.ativo = body.ativo
  }

  const { data: tipo, error } = await supabaseAdmin
    .from("tipos_procedimento")
    .update(data)
    .eq("id", id)
    .select("id, nome, ativo, criadoEm")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(tipo)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: existente } = await supabaseAdmin
    .from("tipos_procedimento")
    .select("id, nome")
    .eq("id", id)
    .maybeSingle()

  if (!existente) {
    return NextResponse.json({ error: "Tipo não encontrado" }, { status: 404 })
  }

  const { count: emUso } = await supabaseAdmin
    .from("procedimentos")
    .select("id", { count: "exact", head: true })
    .eq("tipo", existente.nome)
    .is("deletadoEm", null)

  if (emUso && emUso > 0) {
    return NextResponse.json(
      { error: `Tipo em uso em ${emUso} procedimento(s). Desative-o em vez de excluir.` },
      { status: 409 }
    )
  }

  const { error } = await supabaseAdmin
    .from("tipos_procedimento")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}
