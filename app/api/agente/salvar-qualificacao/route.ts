import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { obterNovoResponsavelPorStatus } from "@/lib/leads/auto-atribuir-responsavel"
import { agora } from "@/lib/db-utils"

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

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("sobreOPaciente, nome, statusFunil")
    .eq("id", leadId)
    .maybeSingle()

  const textoExistente = lead?.sobreOPaciente || ""
  const novoTexto = textoExistente
    ? `${textoExistente}\n---\n${sobreOPaciente}`
    : sobreOPaciente

  const dadosAtualizar: Record<string, unknown> = {
    sobreOPaciente: novoTexto,
    atualizadoEm: agora(),
  }

  if (procedimentoInteresse) {
    dadosAtualizar.procedimentoInteresse = procedimentoInteresse
  }

  if (nomePaciente) {
    const nomeAtual = lead?.nome || ""
    if (nomeAtual.startsWith("WhatsApp ") || !nomeAtual) {
      dadosAtualizar.nome = nomePaciente
    }
  }

  await supabaseAdmin.from("leads").update(dadosAtualizar).eq("id", leadId)

  const etapaAtual = lead?.statusFunil || "acolhimento"
  let novaEtapa: string | null = null

  if (avancarPara) {
    const permitidas = TRANSICOES_PERMITIDAS[etapaAtual] || []
    if (permitidas.includes(avancarPara)) {
      novaEtapa = avancarPara
    }
  } else if (etapaAtual === "acolhimento") {
    novaEtapa = "qualificacao"
  }

  if (novaEtapa) {
    const novoResponsavelId = await obterNovoResponsavelPorStatus(novaEtapa)

    const dataLead: Record<string, unknown> = {
      statusFunil: novaEtapa,
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    }
    if (novoResponsavelId) {
      dataLead.responsavelId = novoResponsavelId
    }

    await supabaseAdmin.from("leads").update(dataLead as never).eq("id", leadId)
    await supabaseAdmin
      .from("conversas")
      .update({ etapa: novaEtapa as never, atualizadoEm: agora() })
      .eq("id", conversaId)
  }

  return NextResponse.json({ sucesso: true, etapaAvancada: novaEtapa })
}
