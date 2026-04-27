import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarBaseConhecimentoSchema } from "@/lib/validations/base-conhecimento"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

const SELECT_BASE = "id, titulo, conteudo, criadoEm, atualizadoEm"

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: registro } = await supabaseAdmin
    .from("base_conhecimento")
    .select(SELECT_BASE)
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!registro) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
  }

  return NextResponse.json(registro)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarBaseConhecimentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: atual } = await supabaseAdmin
    .from("base_conhecimento")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!atual) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
  }

  const { data: atualizado, error } = await supabaseAdmin
    .from("base_conhecimento")
    .update({ ...parsed.data, atualizadoEm: agora() })
    .eq("id", id)
    .select(SELECT_BASE)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(atualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: registro } = await supabaseAdmin
    .from("base_conhecimento")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!registro) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("base_conhecimento")
    .update({ deletadoEm: agora(), atualizadoEm: agora() })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mensagem: "Registro removido" })
}
