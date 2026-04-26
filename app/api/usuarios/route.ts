import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { hash } from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarUsuarioSchema } from "@/lib/validations/usuario"
import { criarId, agora } from "@/lib/db-utils"

const SELECT_USUARIO = "id, nome, email, perfil, tipo, ativo, criadoEm"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const pagina = Number(searchParams.get("pagina") || "1")
  const porPagina = Number(searchParams.get("porPagina") || "10")
  const perfil = searchParams.get("perfil")
  const busca = searchParams.get("busca")

  let query = supabaseAdmin
    .from("usuarios")
    .select(SELECT_USUARIO, { count: "exact" })
    .is("deletadoEm", null)
    .neq("tipo", "ia")

  if (perfil === "gestor" || perfil === "atendente") {
    query = query.eq("perfil", perfil)
  }
  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,email.ilike.%${busca}%`)
  }

  const inicio = (pagina - 1) * porPagina
  const fim = inicio + porPagina - 1

  const { data, count, error } = await query
    .order("criadoEm", { ascending: false })
    .range(inicio, fim)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    dados: data ?? [],
    total: count ?? 0,
    pagina,
    porPagina,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarUsuarioSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { nome, email, senha, perfil, tipo } = parsed.data

  const { data: existente } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existente) {
    return NextResponse.json(
      { error: "Email já cadastrado" },
      { status: 409 }
    )
  }

  const senhaHash = await hash(senha, 12)

  const { data: usuario, error } = await supabaseAdmin
    .from("usuarios")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      nome,
      email,
      senha: senhaHash,
      perfil,
      tipo,
    })
    .select(SELECT_USUARIO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(usuario, { status: 201 })
}
