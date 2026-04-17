import { supabaseAdmin } from "@/lib/supabase"
import { agora } from "@/lib/db-utils"
import { obterNovoResponsavelPorStatus } from "@/lib/leads/auto-atribuir-responsavel"
import type { AnalistaOutput, EstadoAtualLead } from "@/lib/agente/analista-types"

/** Transicoes validas de statusFunil controladas pela Analista.
 *  Espelha TRANSICOES_PERMITIDAS de app/api/agente/salvar-qualificacao/route.ts,
 *  para que ativar/desativar o Analista write mode nao crie divergencia de regra. */
const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  acolhimento: ["qualificacao"],
  qualificacao: ["pre_agendamento"],
  pre_agendamento: ["verificacao_humana"],
}

export interface ResultadoAplicacao {
  camposAtualizados: string[]
  etapaAvancada: string | null
  ignorados: string[]
}

/** Aplica no Supabase as mudancas propostas pela Analista IA.
 *  Idempotente: so escreve campos que realmente mudaram.
 *  Respeita TRANSICOES_PERMITIDAS para evitar saltos invalidos de funil.
 *  Faz append (nunca sobrescreve) em `sobreOPaciente`.
 *  Retorna resumo do que foi escrito para logar em analista_logs. */
export async function aplicarMudancasAnalista(params: {
  leadId: string
  conversaId: string | null
  estadoAtual: EstadoAtualLead
  output: AnalistaOutput
}): Promise<ResultadoAplicacao> {
  const { leadId, conversaId, estadoAtual, output } = params

  const camposAtualizados: string[] = []
  const ignorados: string[] = []

  const updateLead: Record<string, unknown> = {}

  // Nome — so atualiza se o atual for generico "WhatsApp 55..." ou vazio.
  if (output.nome && output.nome !== estadoAtual.nome) {
    const nomeAtual = estadoAtual.nome ?? ""
    if (nomeAtual.startsWith("WhatsApp ") || !nomeAtual) {
      updateLead.nome = output.nome
      camposAtualizados.push("nome")
    } else {
      ignorados.push(`nome (atual "${nomeAtual}" nao e generico — Analista nao sobrescreve)`)
    }
  }

  // Procedimento de interesse — sobrescreve se diferente.
  if (
    output.procedimentoInteresse &&
    output.procedimentoInteresse !== estadoAtual.procedimentoInteresse
  ) {
    updateLead.procedimentoInteresse = output.procedimentoInteresse
    camposAtualizados.push("procedimentoInteresse")
  }

  // sobreOPaciente — sempre append, nunca sobrescreve.
  if (output.sobreOPacienteAdicionar && output.sobreOPacienteAdicionar.trim()) {
    const adicional = output.sobreOPacienteAdicionar.trim()
    const existente = estadoAtual.sobreOPaciente ?? ""
    updateLead.sobreOPaciente = existente ? `${existente}\n---\n${adicional}` : adicional
    camposAtualizados.push("sobreOPaciente")
  }

  if (Object.keys(updateLead).length > 0) {
    updateLead.atualizadoEm = agora()
    const { error } = await supabaseAdmin
      .from("leads")
      .update(updateLead as never)
      .eq("id", leadId)
    if (error) {
      console.error("[analista-aplicar] Erro ao atualizar lead:", error.message)
      throw new Error(`Falha ao atualizar lead: ${error.message}`)
    }
  }

  // Etapa — so avanca se TRANSICOES_PERMITIDAS autoriza.
  let etapaAvancada: string | null = null
  if (output.etapaCorreta !== "manter" && output.etapaCorreta !== estadoAtual.statusFunil) {
    const permitidas = TRANSICOES_PERMITIDAS[estadoAtual.statusFunil] || []
    if (permitidas.includes(output.etapaCorreta)) {
      const novoResponsavelId = await obterNovoResponsavelPorStatus(output.etapaCorreta)
      const dataLead: Record<string, unknown> = {
        statusFunil: output.etapaCorreta,
        ultimaMovimentacaoEm: agora(),
        atualizadoEm: agora(),
      }
      if (novoResponsavelId) dataLead.responsavelId = novoResponsavelId

      const { error: errLead } = await supabaseAdmin
        .from("leads")
        .update(dataLead as never)
        .eq("id", leadId)
      if (errLead) {
        console.error("[analista-aplicar] Erro ao avancar etapa do lead:", errLead.message)
        throw new Error(`Falha ao avancar etapa: ${errLead.message}`)
      }

      if (conversaId) {
        await supabaseAdmin
          .from("conversas")
          .update({ etapa: output.etapaCorreta as never, atualizadoEm: agora() })
          .eq("id", conversaId)
      }

      etapaAvancada = output.etapaCorreta
      camposAtualizados.push(`statusFunil (${estadoAtual.statusFunil} -> ${output.etapaCorreta})`)
    } else {
      ignorados.push(
        `statusFunil (${estadoAtual.statusFunil} -> ${output.etapaCorreta} nao e transicao permitida)`
      )
    }
  }

  return { camposAtualizados, etapaAvancada, ignorados }
}

/** Flag de ambiente que ativa Fase 2 da JLAU-571 (Analista escreve no CRM).
 *  Quando ausente/false, Analista continua em shadow mode (so loga). */
export function analistaWriteModeAtivo(): boolean {
  return process.env.ANALISTA_WRITE_MODE === "true"
}
