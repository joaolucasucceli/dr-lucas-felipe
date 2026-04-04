import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: {
    agendamentoId?: string
    acao?: string
    novaDataHora?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { agendamentoId, acao, novaDataHora } = body

  if (!agendamentoId || !acao) {
    return NextResponse.json(
      { error: "agendamentoId e acao são obrigatórios" },
      { status: 400 }
    )
  }

  if (acao !== "remarcar" && acao !== "cancelar") {
    return NextResponse.json(
      { error: "acao deve ser 'remarcar' ou 'cancelar'" },
      { status: 400 }
    )
  }

  const agendamentoExistente = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: { lead: { select: { id: true } } },
  })

  if (!agendamentoExistente) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  if (acao === "remarcar") {
    if (!novaDataHora) {
      return NextResponse.json(
        { error: "novaDataHora é obrigatório para remarcar" },
        { status: 400 }
      )
    }

    const agendamento = await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: {
        dataHora: new Date(novaDataHora),
        status: "remarcado",
      },
    })

    // TODO: Atualizar evento Google Calendar quando lib estiver disponível

    return NextResponse.json({ agendamento })
  }

  // Cancelar
  const agendamento = await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: { status: "cancelado" },
  })

  // TODO: Deletar evento Google Calendar quando lib estiver disponível

  // Regredir funil: consulta_agendada → agendamento (em transação)
  const conversa = await prisma.conversa.findFirst({
    where: { leadId: agendamentoExistente.leadId },
    orderBy: { criadoEm: "desc" },
  })

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: agendamentoExistente.leadId },
      data: { statusFunil: "agendamento", ultimaMovimentacaoEm: new Date() },
    })
    if (conversa) {
      await tx.conversa.update({
        where: { id: conversa.id },
        data: { etapa: "agendamento" },
      })
    }
  })

  return NextResponse.json({ agendamento })
}
