import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, requireRole } from "@/lib/auth-helpers"
import { criarId } from "@/lib/db-utils"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from("tipos_procedimento")
    .select("id, nome, ativo, criadoEm")
    .order("nome", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: data })
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const nome = (body.nome as string | undefined)?.trim()
  if (!nome || nome.length < 2) {
    return NextResponse.json({ error: "Nome deve ter pelo menos 2 caracteres" }, { status: 400 })
  }

  const { data: existente } = await supabaseAdmin
    .from("tipos_procedimento")
    .select("id")
    .eq("nome", nome)
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ error: "Já existe um tipo com esse nome" }, { status: 409 })
  }

  const { data: tipo, error } = await supabaseAdmin
    .from("tipos_procedimento")
    .insert({ id: criarId(), nome })
    .select("id, nome, ativo, criadoEm")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(tipo, { status: 201 })
}
