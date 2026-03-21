import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth-helpers"
import { atualizarUsuarioSchema } from "@/lib/validations/usuario"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const usuario = await prisma.usuario.findUnique({
    where: { id, deletadoEm: null },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      tipo: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  })

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

  const usuarioAtual = await prisma.usuario.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!usuarioAtual) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  const dados = parsed.data

  // Se email mudou, verificar unicidade
  if (dados.email && dados.email !== usuarioAtual.email) {
    const emailExistente = await prisma.usuario.findUnique({
      where: { email: dados.email },
    })
    if (emailExistente) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })
    }
  }

  // Se senha foi enviada, hashear
  if (dados.senha) {
    dados.senha = await hash(dados.senha, 12)
  }

  const usuarioAtualizado = await prisma.usuario.update({
    where: { id },
    data: dados,
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      tipo: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  })


  return NextResponse.json(usuarioAtualizado)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const usuario = await prisma.usuario.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  // Não permitir deletar o usuário IA
  if (usuario.tipo === "ia") {
    return NextResponse.json(
      { error: "Não é possível remover o usuário IA" },
      { status: 403 }
    )
  }

  await prisma.usuario.update({
    where: { id },
    data: {
      deletadoEm: new Date(),
      ativo: false,
    },
  })

  return NextResponse.json({ mensagem: "Usuário removido" })
}
