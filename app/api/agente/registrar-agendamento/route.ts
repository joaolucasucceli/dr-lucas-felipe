import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"
import { sincronizarFunil, avancarEtapa } from "@/lib/agente/kanban-sync"

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

  // TODO: Criar evento Google Calendar quando lib estiver disponível
  // const configGoogle = await prisma.configGoogleCalendar.findFirst({ where: { ativo: true } })
  // if (configGoogle) { ... }

  // Avançar funil
  await sincronizarFunil(leadId, "consulta_agendada")
  await avancarEtapa(conversaId, "consulta_agendada")

  return NextResponse.json({ agendamento })
}
