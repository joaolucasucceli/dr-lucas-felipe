import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAnyRole, requireRole } from "@/lib/auth-helpers"
import { atualizarEvento, cancelarEvento } from "@/lib/google-calendar"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: {
      lead: { select: { nome: true, whatsapp: true, email: true } },
      procedimento: { select: { nome: true, duracaoMin: true } },
    },
  })

  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  return NextResponse.json(agendamento)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const { id } = await params
  const body = await req.json()
  const { status, dataHora, duracao, observacao, procedimentoId } = body

  const agendamentoAtual = await prisma.agendamento.findUnique({ where: { id } })
  if (!agendamentoAtual) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  const novaDataHora = dataHora ? new Date(dataHora) : agendamentoAtual.dataHora
  const novaDuracao = duracao ?? agendamentoAtual.duracao

  // Sincronizar com Google Calendar se necessário
  if (agendamentoAtual.googleEventId) {
    if (status === "cancelado") {
      await cancelarEvento(agendamentoAtual.googleEventId)
    } else if (dataHora || duracao) {
      const fim = new Date(novaDataHora.getTime() + novaDuracao * 60 * 1000)
      await atualizarEvento(agendamentoAtual.googleEventId, {
        inicio: novaDataHora,
        fim,
      })
    }
  }

  const atualizado = await prisma.agendamento.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(dataHora && { dataHora: novaDataHora }),
      ...(duracao !== undefined && { duracao: novaDuracao }),
      ...(observacao !== undefined && { observacao }),
      ...(procedimentoId !== undefined && { procedimentoId: procedimentoId || null }),
    },
    include: {
      lead: { select: { nome: true, whatsapp: true } },
      procedimento: { select: { nome: true } },
    },
  })

  return NextResponse.json(atualizado)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const agendamento = await prisma.agendamento.findUnique({ where: { id } })
  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  if (agendamento.googleEventId) {
    await cancelarEvento(agendamento.googleEventId)
  }

  // Agendamento não tem deletadoEm — usar status: cancelado como exclusão lógica
  await prisma.agendamento.update({
    where: { id },
    data: { status: "cancelado" },
  })

  return NextResponse.json({ ok: true })
}
