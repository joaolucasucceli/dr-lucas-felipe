import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"
import { obterNovoResponsavelPorStatus } from "@/lib/leads/auto-atribuir-responsavel"
import type { StatusFunil, EtapaConversa } from "@/generated/prisma/client"

// Transições permitidas a partir de cada etapa
const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  acolhimento: ["qualificacao"],
  qualificacao: ["pre_agendamento"],
  pre_agendamento: ["verificacao_humana"],
}

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: {
    leadId?: string
    conversaId?: string
    sobreOPaciente?: string
    procedimentoInteresse?: string
    nomePaciente?: string
    avancarPara?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { leadId, conversaId, sobreOPaciente, procedimentoInteresse, nomePaciente, avancarPara } = body

  if (!leadId || !conversaId || !sobreOPaciente) {
    return NextResponse.json(
      { error: "leadId, conversaId e sobreOPaciente são obrigatórios" },
      { status: 400 }
    )
  }

  // APPEND em sobreOPaciente — NUNCA sobrescrever
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { sobreOPaciente: true, nome: true, statusFunil: true },
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

  // Atualizar nome do lead se informado e o atual é genérico (WhatsApp XXXXX)
  if (nomePaciente) {
    const nomeAtual = lead?.nome || ""
    if (nomeAtual.startsWith("WhatsApp ") || !nomeAtual) {
      dadosAtualizar.nome = nomePaciente
    }
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: dadosAtualizar,
  })

  // Avançar etapa se solicitado ou se estiver em acolhimento (auto-avança para qualificacao)
  const etapaAtual = lead?.statusFunil || "acolhimento"
  let novaEtapa: string | null = null

  if (avancarPara) {
    // IA solicitou avanço explícito — validar se é permitido
    const permitidas = TRANSICOES_PERMITIDAS[etapaAtual] || []
    if (permitidas.includes(avancarPara)) {
      novaEtapa = avancarPara
    }
  } else if (etapaAtual === "acolhimento") {
    // Auto-avança acolhimento → qualificacao na primeira salvar_qualificacao
    novaEtapa = "qualificacao"
  }

  if (novaEtapa) {
    // Auto-atribuir responsável conforme nova etapa (verificacao_humana → atendente)
    const novoResponsavelId = await obterNovoResponsavelPorStatus(novaEtapa)
    const dataLead: Record<string, unknown> = {
      statusFunil: novaEtapa as StatusFunil,
      ultimaMovimentacaoEm: new Date(),
    }
    if (novoResponsavelId) {
      dataLead.responsavelId = novoResponsavelId
    }

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: dataLead,
      }),
      prisma.conversa.update({
        where: { id: conversaId },
        data: { etapa: novaEtapa as EtapaConversa },
      }),
    ])
  }

  return NextResponse.json({ sucesso: true, etapaAvancada: novaEtapa })
}
