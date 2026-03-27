import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarMarcoSchema } from "@/lib/validations/prontuario"
import type { Prisma } from "@/generated/prisma/client"

type RouteParams = { params: Promise<{ id: string; evolucaoId: string }> }

interface MarcoRecuperacao {
  descricao: string
  dataPrevista: string
  dataConcluida?: string | null
  concluido: boolean
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const body = await request.json()
  const parsed = atualizarMarcoSchema.safeParse(body)

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

  const registro = await prisma.registroCirurgico.findFirst({
    where: { evolucaoId },
  })

  if (!registro) {
    return NextResponse.json({ error: "Registro cirúrgico não encontrado" }, { status: 404 })
  }

  const marcos = (registro.marcosRecuperacao as MarcoRecuperacao[] | null) || []
  const { indice, concluido, dataConcluida } = parsed.data

  if (indice < 0 || indice >= marcos.length) {
    return NextResponse.json({ error: "Índice de marco inválido" }, { status: 400 })
  }

  marcos[indice] = {
    ...marcos[indice],
    concluido,
    dataConcluida: dataConcluida ?? (concluido ? new Date().toISOString() : null),
  }

  const atualizado = await prisma.registroCirurgico.update({
    where: { id: registro.id },
    data: { marcosRecuperacao: marcos as unknown as Prisma.InputJsonValue },
  })

  return NextResponse.json(atualizado)
}
