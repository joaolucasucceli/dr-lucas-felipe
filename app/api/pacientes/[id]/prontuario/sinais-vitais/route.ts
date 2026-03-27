import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { criarSinalVitalSchema } from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get("tipo")
  const limite = parseInt(searchParams.get("limite") || "50")

  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id, deletadoEm: null } },
    select: { id: true },
  })

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const where = {
    prontuarioId: prontuario.id,
    ...(tipo ? { tipo: tipo as never } : {}),
  }

  const sinais = await prisma.sinalVital.findMany({
    where,
    orderBy: { dataRegistro: "desc" },
    take: limite,
  })

  return NextResponse.json({ dados: sinais })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = criarSinalVitalSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id, deletadoEm: null } },
    select: { id: true },
  })

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const { dataRegistro, ...resto } = parsed.data

  const sinal = await prisma.sinalVital.create({
    data: {
      prontuarioId: prontuario.id,
      ...resto,
      dataRegistro: dataRegistro ? new Date(dataRegistro) : new Date(),
    },
  })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "SinalVital",
    entidadeId: sinal.id,
    dadosDepois: sinal as unknown as Record<string, unknown>,
  })

  return NextResponse.json(sinal, { status: 201 })
}
