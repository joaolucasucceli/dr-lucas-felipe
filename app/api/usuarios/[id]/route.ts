import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { hash } from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, requireRole } from "@/lib/auth-helpers"
import { atualizarUsuarioSchema } from "@/lib/validations/usuario"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

const SELECT_USUARIO = "id, nome, email, perfil, tipo, ativo, criadoEm, atualizadoEm"

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select(SELECT_USUARIO)
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  return NextResponse.json(usuario)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarUsuarioSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: usuarioAtual } = await supabaseAdmin
    .from("usuarios")
    .select("id, email")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!usuarioAtual) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  const dados = { ...parsed.data }

  if (dados.email && dados.email !== usuarioAtual.email) {
    const { data: emailExistente } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("email", dados.email)
      .maybeSingle()
    if (emailExistente) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })
    }
  }

  if (dados.senha) {
    dados.senha = await hash(dados.senha, 12)
  }

  const { data: usuarioAtualizado, error } = await supabaseAdmin
    .from("usuarios")
    .update({ ...dados, atualizadoEm: agora() })
    .eq("id", id)
    .select(SELECT_USUARIO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(usuarioAtualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, tipo")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  if (usuario.tipo === "ia") {
    return NextResponse.json(
      { error: "Não é possível remover o usuário IA" },
      { status: 403 }
    )
  }

  const { error } = await supabaseAdmin
    .from("usuarios")
    .update({
      deletadoEm: agora(),
      ativo: false,
      atualizadoEm: agora(),
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mensagem: "Usuário removido" })
}
