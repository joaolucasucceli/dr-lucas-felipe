import { supabaseAdmin } from "@/lib/supabase"
import { agora } from "@/lib/db-utils"
import type { StatusFunil, TipoContato } from "@/lib/types/enums"

/** Estado atual do contato lido antes de aplicar as mudancas da Ana Julia. */
export interface EstadoAtualContato {
  nome: string
  origem: string | null
  tipo: TipoContato | null
  statusFunil: StatusFunil | null
  procedimentoInteresse: string | null
  sobreOPaciente: string | null
}

/** Mudancas propostas pela Ana Julia via a tool `atualizar_lead`.
 *  Todos os campos sao opcionais: a Ana so manda o que descobriu. */
export interface MudancasLead {
  nome?: string | null
  procedimentoInteresse?: string | null
  sobreOPacienteAdicionar?: string | null
  etapaCorreta?: "manter" | "qualificacao" | "orcamento" | "agendamento"
}

/** Transicoes validas de statusFunil controladas pela Ana Julia.
 *  Ela nunca regride etapa nem avanca para consulta_agendada
 *  (esse avanco e responsabilidade exclusiva da tool `registrar_agendamento`). */
const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  acolhimento: ["qualificacao"],
  qualificacao: ["orcamento"],
  orcamento: ["agendamento"],
}

export const MARCADOR_NOME_AUTODECLARADO = "Nome informado pelo paciente:"

function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ")
}

function nomesIguais(a: string, b: string): boolean {
  return (
    normalizarNome(a).toLocaleLowerCase("pt-BR") ===
    normalizarNome(b).toLocaleLowerCase("pt-BR")
  )
}

function deveSobrescreverNome(estadoAtual: EstadoAtualContato): boolean {
  const nomeAtual = estadoAtual.nome ?? ""
  if (!nomeAtual || nomeAtual.startsWith("WhatsApp ")) return true
  return estadoAtual.origem === "whatsapp" && estadoAtual.tipo === "lead"
}

export function temNomeAutodeclarado(
  sobreOPaciente: string | null | undefined,
  nome: string | null | undefined
): boolean {
  if (!sobreOPaciente || !nome) return false
  return sobreOPaciente.includes(`${MARCADOR_NOME_AUTODECLARADO} ${normalizarNome(nome)}`)
}

function adicionarCampo(lista: string[], campo: string) {
  if (!lista.includes(campo)) lista.push(campo)
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
  const fatosParaAdicionar: string[] = []

  // Nome: quando vem pela tool, foi informado pelo paciente na conversa.
  // Leads do WhatsApp podem nascer com nome de perfil incorreto; nesse caso
  // o nome autodeclarado tem prioridade sobre o cadastro inicial.
  if (mudancas.nome?.trim()) {
    const novoNome = normalizarNome(mudancas.nome)
    const nomeAtual = normalizarNome(estadoAtual.nome ?? "")

    if (!nomesIguais(novoNome, nomeAtual)) {
      if (deveSobrescreverNome(estadoAtual)) {
        updateLead.nome = novoNome
        camposAtualizados.push("nome")

        if (!temNomeAutodeclarado(estadoAtual.sobreOPaciente, novoNome)) {
          fatosParaAdicionar.push(`${MARCADOR_NOME_AUTODECLARADO} ${novoNome}`)
          adicionarCampo(camposAtualizados, "sobreOPaciente")
        }
      } else {
        ignorados.push(
          `nome (atual "${nomeAtual}" nao e lead do WhatsApp - nao sobrescreve)`
        )
      }
    } else if (!temNomeAutodeclarado(estadoAtual.sobreOPaciente, novoNome)) {
      fatosParaAdicionar.push(`${MARCADOR_NOME_AUTODECLARADO} ${novoNome}`)
      adicionarCampo(camposAtualizados, "sobreOPaciente")
    } else {
      ignorados.push("nome (igual ao atual)")
    }
  }

  // Procedimento de interesse: sobrescreve se diferente.
  if (
    mudancas.procedimentoInteresse &&
    mudancas.procedimentoInteresse !== estadoAtual.procedimentoInteresse
  ) {
    updateLead.procedimentoInteresse = mudancas.procedimentoInteresse
    camposAtualizados.push("procedimentoInteresse")
  }

  // sobreOPaciente: sempre append, nunca sobrescreve.
  if (mudancas.sobreOPacienteAdicionar && mudancas.sobreOPacienteAdicionar.trim()) {
    fatosParaAdicionar.push(mudancas.sobreOPacienteAdicionar.trim())
    adicionarCampo(camposAtualizados, "sobreOPaciente")
  }

  if (fatosParaAdicionar.length > 0) {
    const existente = estadoAtual.sobreOPaciente ?? ""
    updateLead.sobreOPaciente = [existente, ...fatosParaAdicionar]
      .filter(Boolean)
      .join("\n---\n")
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

  // Etapa: so avanca se TRANSICOES_PERMITIDAS autoriza.
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
