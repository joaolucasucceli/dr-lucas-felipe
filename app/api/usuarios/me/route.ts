import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { compare, hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

const atualizarMeSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  senhaAtual: z.string().optional(),
  novaSenha: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres").optional(),
}).refine(
  (d) => !(d.novaSenha && !d.senhaAtual),
  { message: "Informe a senha atual para alterar a senha", path: ["senhaAtual"] }
)

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const usuario = await prisma.usuario.findUnique({
    where: { id: session!.user.id, deletadoEm: null },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      tipo: true,
      criadoEm: true,
    },
  })

  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  return NextResponse.json(usuario)
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const body = await request.json()
  const parsed = atualizarMeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { nome, email, senhaAtual, novaSenha } = parsed.data

  const usuario = await prisma.usuario.findUnique({
    where: { id: session!.user.id, deletadoEm: null },
  })

  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  // Verificar email único
  if (email && email !== usuario.email) {
    const emailExistente = await prisma.usuario.findUnique({ where: { email } })
    if (emailExistente) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })
    }
  }

  // Verificar senha atual antes de alterar
  if (novaSenha) {
    const senhaValida = await compare(senhaAtual!, usuario.senha)
    if (!senhaValida) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
    }
  }

  const dados: Record<string, unknown> = {}
  if (nome) dados.nome = nome
  if (email) dados.email = email
  if (novaSenha) dados.senha = await hash(novaSenha, 12)

  const atualizado = await prisma.usuario.update({
    where: { id: session!.user.id },
    data: dados,
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
    },
  })

  return NextResponse.json(atualizado)
}
