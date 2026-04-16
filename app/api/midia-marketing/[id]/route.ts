import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarMidiaMarketingSchema } from "@/lib/validations/midia-marketing"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: midia } = await supabaseAdmin
    .from("midia_marketing")
    .select("*")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!midia) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  return NextResponse.json(midia)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: existe } = await supabaseAdmin
    .from("midia_marketing")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!existe) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = atualizarMidiaMarketingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: midia, error } = await supabaseAdmin
    .from("midia_marketing")
    .update({ ...parsed.data, atualizadoEm: agora() })
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(midia)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { error } = await supabaseAdmin
    .from("midia_marketing")
    .update({ deletadoEm: agora(), ativo: false, atualizadoEm: agora() })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mensagem: "Removido" })
}
