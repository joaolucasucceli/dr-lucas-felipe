import { supabaseAdmin } from "@/lib/supabase"
import { criarId, agora, instanteDoBanco } from "@/lib/db-utils"
import type { Database } from "@/lib/types/database"

type ConversaRow = Database["public"]["Tables"]["conversas"]["Row"]

/**
 * FONTE UNICA de "qual conversa esta atendendo este contato agora".
 *
 * Um atendimento e uma conversa aberta E ativa. Duas formas de encerrar:
 *
 * 1. `encerradaEm` preenchido (follow-up de 48h, auto-close, fechamento manual)
 * 2. SILENCIO maior que `JANELA_ATENDIMENTO_HORAS` desde a ultima mensagem
 *
 * A segunda regra existe porque a primeira nao e confiavel sozinha. Auditoria
 * de 23/07/2026 (OPE-424): `cron/auto-close` so encerra conversa que ja recebeu
 * o follow-up "24h", e `agente/followup.ts` nao manda follow-up para a etapa
 * `consulta_agendada`. As duas pecas se cancelam e a conversa que chega em
 * `consulta_agendada` fica aberta PARA SEMPRE. Era exatamente o caso do print
 * do Dr. Lucas: conversa de 14/07 ainda aberta em 23/07, com o orcamento de
 * R$ 10.000 daquele dia sendo despejado no primeiro "Ola" nove dias depois.
 *
 * Definir atendimento por inatividade nao depende de nenhum cron ter rodado —
 * a propria chegada da mensagem decide. Um cron que falha vira atraso de
 * limpeza, nao contexto errado na cara do paciente.
 *
 * Todo mundo que precisa da conversa corrente passa por aqui. Quem quiser
 * historico completo do contato busca por `contatoId` e diz explicitamente que
 * quer conversas encerradas junto.
 */

/**
 * Silencio que encerra um atendimento (decisao do Joao, 23/07/2026).
 *
 * FONTE UNICA — consumida por `obterOuAbrirAtendimento` e pelo cron
 * `auto-close`. Vale para TODAS as etapas, sem excecao: etapa que escapa da
 * regra vira conversa imortal, que foi a causa raiz do print.
 *
 * 48h casa com o follow-up de encerramento que ja existe e preserva o lead que
 * responde no dia seguinte dentro do mesmo atendimento.
 */
export const JANELA_ATENDIMENTO_HORAS = 48

const JANELA_ATENDIMENTO_MS = JANELA_ATENDIMENTO_HORAS * 60 * 60 * 1000

/**
 * Decisao pura: esta conversa ainda esta atendendo, ou o silencio ja a encerrou?
 *
 * Sem I/O de proposito — e a regra que precisa de teste, nao a query.
 * `referencia` = ultima mensagem da conversa (ou a criacao, quando ela nunca
 * recebeu nenhuma).
 */
export function atendimentoExpirouPorSilencio(params: {
  referenciaIso: string | null
  agoraMs: number
}): boolean {
  const { referenciaIso, agoraMs } = params

  // `instanteDoBanco` porque as colunas de data de `conversas` sao
  // `timestamp WITHOUT time zone`: sem isso a conta muda de resultado conforme
  // o fuso da maquina que roda o codigo.
  const referenciaMs = instanteDoBanco(referenciaIso)
  if (Number.isNaN(referenciaMs)) return false

  return agoraMs - referenciaMs > JANELA_ATENDIMENTO_MS
}

export type Atendimento = {
  conversa: ConversaRow
  /**
   * true quando a conversa anterior estava encerrada e esta chamada abriu um
   * atendimento novo. Falso tanto no primeiro contato da vida quanto na
   * continuacao de uma conversa que ja estava aberta.
   */
  abriuNovoAtendimento: boolean
}

/** Conversa aberta do contato, ou null se todas estao encerradas. */
export async function obterAtendimentoAberto(
  contatoId: string
): Promise<ConversaRow | null> {
  const { data, error } = await supabaseAdmin
    .from("conversas")
    .select("*")
    .eq("contatoId", contatoId)
    .is("encerradaEm", null)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[Atendimento] Falha ao buscar conversa aberta:", error.message)
    return null
  }

  return data ?? null
}

/**
 * Devolve a conversa aberta do contato; se nao houver, abre uma.
 *
 * `ciclo` vem de `contatos.cicloAtual` (ciclo CLINICO do paciente — muda quando
 * ele realiza um procedimento e volta). Nao confundir com atendimento: o mesmo
 * ciclo clinico pode ter varios atendimentos, um por conversa.
 */
export async function obterOuAbrirAtendimento(params: {
  contatoId: string
  ciclo: number
}): Promise<Atendimento | null> {
  const { contatoId, ciclo } = params

  const aberta = await obterAtendimentoAberto(contatoId)

  if (aberta) {
    const expirou = atendimentoExpirouPorSilencio({
      referenciaIso: aberta.ultimaMensagemEm ?? aberta.criadoEm,
      agoraMs: Date.now(),
    })

    if (!expirou) {
      return { conversa: aberta, abriuNovoAtendimento: false }
    }

    // Silencio longo demais: fecha o atendimento anterior datando pela ultima
    // atividade real (nao por "agora" — senao o historico registra um
    // encerramento que so aconteceu porque o paciente voltou).
    const { error: erroEncerrar } = await supabaseAdmin
      .from("conversas")
      .update({
        encerradaEm: aberta.ultimaMensagemEm ?? aberta.criadoEm,
        atualizadoEm: agora(),
      })
      .eq("id", aberta.id)
      .is("encerradaEm", null)

    if (erroEncerrar) {
      // Nao conseguiu fechar: seguir com a conversa antiga e um atendimento
      // esticado e menos pior do que abrir uma segunda conversa aberta (o
      // indice unico recusaria) ou perder a mensagem do paciente.
      console.error(
        "[Atendimento] Falha ao encerrar atendimento silencioso:",
        erroEncerrar.message
      )
      return { conversa: aberta, abriuNovoAtendimento: false }
    }

    console.log("[Atendimento] Atendimento encerrado por silencio", {
      contatoId,
      conversaId: aberta.id,
      ultimaAtividade: aberta.ultimaMensagemEm ?? aberta.criadoEm,
      janelaHoras: JANELA_ATENDIMENTO_HORAS,
    })
  }

  // Sem conversa aberta: ou e o primeiro contato, ou o paciente voltou depois
  // do encerramento. A distincao so serve para log e para o contexto do agente.
  const { data: anterior } = await supabaseAdmin
    .from("conversas")
    .select("id")
    .eq("contatoId", contatoId)
    .limit(1)
    .maybeSingle()

  const { data: nova, error } = await supabaseAdmin
    .from("conversas")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      contatoId,
      ciclo,
    })
    .select("*")
    .single()

  if (error || !nova) {
    // Corrida entre duas mensagens do mesmo contato: o indice unico parcial
    // (migration 20260723210000) deixa so uma conversa aberta passar. Quem
    // perdeu a corrida reaproveita a que venceu.
    const vencedora = await obterAtendimentoAberto(contatoId)
    if (vencedora) {
      return { conversa: vencedora, abriuNovoAtendimento: false }
    }
    console.error(
      "[Atendimento] Falha ao abrir conversa:",
      error?.message ?? "insert sem retorno"
    )
    return null
  }

  const abriuNovoAtendimento = Boolean(anterior)
  if (abriuNovoAtendimento) {
    console.log("[Atendimento] Paciente voltou — atendimento novo aberto", {
      contatoId,
      conversaId: nova.id,
      ciclo,
    })
  }

  return { conversa: nova, abriuNovoAtendimento }
}
