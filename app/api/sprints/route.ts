import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"
import { registrarAudit, getIpFromHeaders } from "@/lib/audit"
import { criarSprintSchema } from "@/lib/validations/sprint"

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const status = searchParams.get("status")

  const where: Record<string, unknown> = {
    deletadoEm: null,
  }

  if (status) {
    where.status = status
  }

  const sprints = await prisma.sprint.findMany({
    where,
    select: {
      id: true,
      nome: true,
      descricao: true,
      status: true,
      dataInicio: true,
      dataFim: true,
      ordem: true,
      criadoEm: true,
      atualizadoEm: true,
      itens: {
        select: {
          id: true,
          titulo: true,
          concluido: true,
          ordem: true,
          criadoEm: true,
        },
        orderBy: { ordem: "asc" },
      },
    },
    orderBy: { ordem: "asc" },
  })

  const dados = sprints.map((sprint) => {
    const total = sprint.itens.length
    const concluidos = sprint.itens.filter((i) => i.concluido).length
    const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0
    return { ...sprint, progresso }
  })

  return NextResponse.json({ dados })
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarSprintSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { dataInicio, dataFim, ...rest } = parsed.data

  const sprint = await prisma.sprint.create({
    data: {
      ...rest,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFim: dataFim ? new Date(dataFim) : null,
    },
    select: {
      id: true,
      nome: true,
      descricao: true,
      status: true,
      dataInicio: true,
      dataFim: true,
      ordem: true,
      criadoEm: true,
    },
  })

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: "create",
    entidade: "Sprint",
    entidadeId: sprint.id,
    dadosDepois: sprint,
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json(sprint, { status: 201 })
}
