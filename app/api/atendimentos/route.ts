import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await request.json()
  const { leadId } = body

  if (!leadId) {
    return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 })
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  if (lead.statusFunil !== "concluido" && lead.statusFunil !== "perdido") {
    return NextResponse.json(
      { error: "Lead já possui atendimento em andamento" },
      { status: 409 }
    )
  }

  const novoCiclo = lead.cicloAtual + 1

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        cicloAtual: novoCiclo,
        ciclosCompletos: { increment: 1 },
        ehRetorno: true,
        statusFunil: "acolhimento",
        motivoPerda: null,
        ultimaMovimentacaoEm: new Date(),
      },
    }),
    prisma.conversa.create({
      data: {
        leadId,
        ciclo: novoCiclo,
        etapa: "acolhimento",
      },
    }),
  ])

  return NextResponse.json({ sucesso: true })
}
