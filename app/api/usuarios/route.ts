import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarUsuarioSchema } from "@/lib/validations/usuario"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const pagina = Number(searchParams.get("pagina") || "1")
  const porPagina = Number(searchParams.get("porPagina") || "10")
  const perfil = searchParams.get("perfil")
  const ativo = searchParams.get("ativo")
  const busca = searchParams.get("busca")

  const where: Record<string, unknown> = {
    deletadoEm: null,
  }

  if (perfil) where.perfil = perfil
  if (ativo !== null && ativo !== undefined && ativo !== "") {
    where.ativo = ativo === "true"
  }
  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: "insensitive" } },
      { email: { contains: busca, mode: "insensitive" } },
    ]
  }

  const [dados, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        tipo: true,
        ativo: true,
        criadoEm: true,
      },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      orderBy: { criadoEm: "desc" },
    }),
    prisma.usuario.count({ where }),
  ])

  return NextResponse.json({ dados, total, pagina, porPagina })
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

  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) {
    return NextResponse.json(
      { error: "Email já cadastrado" },
      { status: 409 }
    )
  }

  const senhaHash = await hash(senha, 12)

  const usuario = await prisma.usuario.create({
    data: { nome, email, senha: senhaHash, perfil, tipo },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      tipo: true,
      ativo: true,
      criadoEm: true,
    },
  })

  return NextResponse.json(usuario, { status: 201 })
}
