import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"
import { criarEvento } from "@/lib/google-calendar"

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

  const inicio = new Date(dataHora)

  const agendamento = await prisma.agendamento.create({
    data: {
      leadId,
      procedimentoId: procedimentoId || null,
      dataHora: inicio,
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

  // Criar evento no Google Calendar (graceful fallback se não configurado)
  const [lead, procedimento] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId }, select: { nome: true, email: true, whatsapp: true } }),
    procedimentoId
      ? prisma.procedimento.findUnique({ where: { id: procedimentoId }, select: { nome: true, duracaoMin: true } })
      : null,
  ])

  const duracaoMin = procedimento?.duracaoMin ?? agendamento.duracao ?? 60
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000)
  const tituloEvento = procedimento
    ? `Consulta — ${procedimento.nome} (${lead?.nome ?? "Paciente"})`
    : `Consulta — ${lead?.nome ?? "Paciente"}`
  const descricaoEvento = [
    `Paciente: ${lead?.nome ?? "-"}`,
    lead?.whatsapp ? `WhatsApp: ${lead.whatsapp}` : null,
    procedimento ? `Procedimento: ${procedimento.nome}` : null,
    observacao ? `Observação: ${observacao}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const resultadoCalendar = await criarEvento({
    titulo: tituloEvento,
    descricao: descricaoEvento,
    inicio,
    fim,
    emailPaciente: lead?.email ?? undefined,
  })

  if (resultadoCalendar) {
    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: {
        googleEventId: resultadoCalendar.googleEventId,
        googleEventUrl: resultadoCalendar.googleEventUrl,
        sincronizado: true,
        duracao: duracaoMin,
      },
    })
  }

  return NextResponse.json({ agendamento, sincronizado: !!resultadoCalendar })
}
