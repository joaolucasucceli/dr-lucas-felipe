import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: {
    leadId?: string
    conversaId?: string
    procedimentoId?: string
    dataHora?: string
    observacao?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { leadId, conversaId, procedimentoId, dataHora, observacao } = body

  if (!leadId || !conversaId || !dataHora) {
    return NextResponse.json(
      { error: "leadId, conversaId e dataHora são obrigatórios" },
      { status: 400 }
    )
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      leadId,
      procedimentoId: procedimentoId || null,
      dataHora: new Date(dataHora),
      status: "agendado",
      observacao: observacao || null,
    },
  })

  // Avançar etapa → consulta_agendada (em transação)
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { statusFunil: "consulta_agendada", ultimaMovimentacaoEm: new Date() },
    })
    if (conversaId) {
      await tx.conversa.update({
        where: { id: conversaId },
        data: { etapa: "consulta_agendada" },
      })
    }
  })

  // TODO: Criar evento Google Calendar quando lib estiver disponível

  return NextResponse.json({ agendamento })
}
