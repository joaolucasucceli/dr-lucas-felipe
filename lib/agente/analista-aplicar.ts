import { supabaseAdmin } from "@/lib/supabase"
import { agora } from "@/lib/db-utils"
import type { AnalistaOutput, EstadoAtualContato } from "@/lib/agente/analista-types"

/** Transicoes validas de statusFunil controladas pela Analista.
 *  Analista nunca regride etapa nem avanca para consulta_agendada
 *  (esse avanco e responsabilidade da tool `registrar_agendamento`). */
const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  acolhimento: ["qualificacao"],
  qualificacao: ["agendamento"],
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
  contatoId: string
  conversaId: string | null
  estadoAtual: EstadoAtualContato
  output: AnalistaOutput
}): Promise<ResultadoAplicacao> {
  const { contatoId, conversaId, estadoAtual, output } = params

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
      .from("contatos")
      .update(updateLead as never)
      .eq("id", contatoId)
    if (error) {
      console.error("[analista-aplicar] Erro ao atualizar lead:", error.message)
      throw new Error(`Falha ao atualizar lead: ${error.message}`)
    }
  }

  // Etapa — so avanca se TRANSICOES_PERMITIDAS autoriza.
  let etapaAvancada: string | null = null
  if (output.etapaCorreta !== "manter" && output.etapaCorreta !== estadoAtual.statusFunil) {
    const etapaAtual = estadoAtual.statusFunil ?? "acolhimento"
    const permitidas = TRANSICOES_PERMITIDAS[etapaAtual] || []
    if (permitidas.includes(output.etapaCorreta)) {
      const dataLead: Record<string, unknown> = {
        statusFunil: output.etapaCorreta,
        ultimaMovimentacaoEm: agora(),
        atualizadoEm: agora(),
      }

      const { error: errLead } = await supabaseAdmin
        .from("contatos")
        .update(dataLead as never)
        .eq("id", contatoId)
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
 *  Quando ausente/false, Analista continua em shadow mode (so loga).
 *  Trim defensivo: `vercel env add` via echo persiste o newline final. */
export function analistaWriteModeAtivo(): boolean {
  return (process.env.ANALISTA_WRITE_MODE ?? "").trim() === "true"
}
