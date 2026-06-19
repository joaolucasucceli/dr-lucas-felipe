import { supabaseAdmin } from "@/lib/supabase"
import { agora } from "@/lib/db-utils"
import type { StatusFunil } from "@/lib/types/enums"

/** Estado atual do contato lido antes de aplicar as mudancas da Ana Julia. */
export interface EstadoAtualContato {
  nome: string
  statusFunil: StatusFunil | null
  procedimentoInteresse: string | null
  sobreOPaciente: string | null
}

/** Mudancas propostas pela Ana Julia via a tool `atualizar_lead`.
 *  Todos os campos sao opcionais — a Ana so manda o que descobriu. */
export interface MudancasLead {
  nome?: string | null
  procedimentoInteresse?: string | null
  sobreOPacienteAdicionar?: string | null
  etapaCorreta?: "manter" | "qualificacao" | "agendamento"
}

/** Transicoes validas de statusFunil controladas pela Ana Julia.
 *  Ela nunca regride etapa nem avanca para consulta_agendada
 *  (esse avanco e responsabilidade exclusiva da tool `registrar_agendamento`). */
const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  acolhimento: ["qualificacao"],
  qualificacao: ["agendamento"],
}

export interface ResultadoAplicacao {
  camposAtualizados: string[]
  etapaAvancada: string | null
  ignorados: string[]
}

/** Aplica no Supabase as mudancas propostas pela Ana Julia.
 *  Idempotente: so escreve campos que realmente mudaram.
 *  Respeita TRANSICOES_PERMITIDAS para evitar saltos invalidos de funil.
 *  Faz append (nunca sobrescreve) em `sobreOPaciente`.
 *  Retorna resumo do que foi escrito. */
export async function aplicarMudancasLead(params: {
  contatoId: string
  conversaId: string | null
  estadoAtual: EstadoAtualContato
  mudancas: MudancasLead
}): Promise<ResultadoAplicacao> {
  const { contatoId, conversaId, estadoAtual, mudancas } = params

  const camposAtualizados: string[] = []
  const ignorados: string[] = []

  const updateLead: Record<string, unknown> = {}

  // Nome — so atualiza se o atual for generico "WhatsApp 55..." ou vazio.
  if (mudancas.nome && mudancas.nome !== estadoAtual.nome) {
    const nomeAtual = estadoAtual.nome ?? ""
    if (nomeAtual.startsWith("WhatsApp ") || !nomeAtual) {
      updateLead.nome = mudancas.nome
      camposAtualizados.push("nome")
    } else {
      ignorados.push(`nome (atual "${nomeAtual}" nao e generico — nao sobrescreve)`)
    }
  }

  // Procedimento de interesse — sobrescreve se diferente.
  if (
    mudancas.procedimentoInteresse &&
    mudancas.procedimentoInteresse !== estadoAtual.procedimentoInteresse
  ) {
    updateLead.procedimentoInteresse = mudancas.procedimentoInteresse
    camposAtualizados.push("procedimentoInteresse")
  }

  // sobreOPaciente — sempre append, nunca sobrescreve.
  if (mudancas.sobreOPacienteAdicionar && mudancas.sobreOPacienteAdicionar.trim()) {
    const adicional = mudancas.sobreOPacienteAdicionar.trim()
    const existente = estadoAtual.sobreOPaciente ?? ""
    updateLead.sobreOPaciente = existente ? `${existente}\n---\n${adicional}` : adicional
    camposAtualizados.push("sobreOPaciente")
  }

  if (Object.keys(updateLead).length > 0) {
    updateLead.atualizadoEm = agora()
    const { error } = await supabaseAdmin
      .from("contatos")
      .update(updateLead as never)
      .eq("id", contatoId)
    if (error) {
      console.error("[atualizar-lead] Erro ao atualizar lead:", error.message)
      throw new Error(`Falha ao atualizar lead: ${error.message}`)
    }
  }

  // Etapa — so avanca se TRANSICOES_PERMITIDAS autoriza.
  let etapaAvancada: string | null = null
  const etapaCorreta = mudancas.etapaCorreta
  if (etapaCorreta && etapaCorreta !== "manter" && etapaCorreta !== estadoAtual.statusFunil) {
    const etapaAtual = estadoAtual.statusFunil ?? "acolhimento"
    const permitidas = TRANSICOES_PERMITIDAS[etapaAtual] || []
    if (permitidas.includes(etapaCorreta)) {
      const dataLead: Record<string, unknown> = {
        statusFunil: etapaCorreta,
        ultimaMovimentacaoEm: agora(),
        atualizadoEm: agora(),
      }

      const { error: errLead } = await supabaseAdmin
        .from("contatos")
        .update(dataLead as never)
        .eq("id", contatoId)
      if (errLead) {
        console.error("[atualizar-lead] Erro ao avancar etapa do lead:", errLead.message)
        throw new Error(`Falha ao avancar etapa: ${errLead.message}`)
      }

      if (conversaId) {
        await supabaseAdmin
          .from("conversas")
          .update({ etapa: etapaCorreta as never, atualizadoEm: agora() })
          .eq("id", conversaId)
      }

      etapaAvancada = etapaCorreta
      camposAtualizados.push(`statusFunil (${estadoAtual.statusFunil} -> ${etapaCorreta})`)
    } else {
      ignorados.push(
        `statusFunil (${estadoAtual.statusFunil} -> ${etapaCorreta} nao e transicao permitida)`
      )
    }
  }

  return { camposAtualizados, etapaAvancada, ignorados }
}
