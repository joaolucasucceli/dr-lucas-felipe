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
    sobreOPaciente?: string
    procedimentoInteresse?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { leadId, conversaId, sobreOPaciente, procedimentoInteresse } = body

  if (!leadId || !conversaId || !sobreOPaciente) {
    return NextResponse.json(
      { error: "leadId, conversaId e sobreOPaciente são obrigatórios" },
      { status: 400 }
    )
  }

  // APPEND em sobreOPaciente — NUNCA sobrescrever
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { sobreOPaciente: true },
  })

  const textoExistente = lead?.sobreOPaciente || ""
  const novoTexto = textoExistente
    ? `${textoExistente}\n---\n${sobreOPaciente}`
    : sobreOPaciente

  const dadosAtualizar: Record<string, unknown> = {
    sobreOPaciente: novoTexto,
  }

  if (procedimentoInteresse) {
    dadosAtualizar.procedimentoInteresse = procedimentoInteresse
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: dadosAtualizar,
  })

  // Avançar funil
  await sincronizarFunil(leadId, "agendamento")
  await avancarEtapa(conversaId, "agendamento")

  return NextResponse.json({ sucesso: true })
}
