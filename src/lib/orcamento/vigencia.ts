import { supabaseAdmin } from "@/lib/supabase"
import { formatarBrl } from "@/lib/orcamento/gerar"

/**
 * FONTE UNICA de "existe orcamento do Dr. Lucas valendo NESTE atendimento?".
 *
 * Antes de 23/07/2026 cinco pontos rodavam a propria query de "ultimo orcamento
 * respondido do contato", nenhum filtrando data ou atendimento. Um orcamento de
 * qualquer epoca voltava como contexto vivo: entrava no system prompt com valor
 * e URL do PDF, abria a agenda para lead nunca qualificado e — o pior, porque
 * era silencioso — impedia o contato de gerar orcamento novo para sempre.
 *
 * Vigente exige as tres coisas ao mesmo tempo:
 *   1. respondido pelo Dr. Lucas e nao cancelado
 *   2. nascido no atendimento ATUAL (mesma `conversaId`)
 *   3. dentro da validade impressa no proprio PDF (`validoAte`)
 *
 * Quem precisar de outro criterio acrescenta AQUI. Uma sexta query espalhada e
 * como esta issue comecou.
 */

export interface OrcamentoVigente {
  id: string
  valorCentavos: number | null
  /** Valor pronto para exibicao ("R$ 10.000,00"), ou null se nao houver valor. */
  valorFormatado: string | null
  pdfUrl: string | null
  nomeArquivo: string | null
  respondidoEm: string | null
  validoAte: string | null
  resumoCaso: string | null
}

export async function orcamentoVigente(params: {
  contatoId: string
  conversaId: string | null
}): Promise<OrcamentoVigente | null> {
  const { contatoId, conversaId } = params

  // Sem atendimento identificado nao da para afirmar que o orcamento pertence a
  // conversa corrente. Tratar como "nao vigente" e o lado seguro: no maximo o
  // paciente recebe um orcamento novo; o outro lado e anunciar valor alheio.
  if (!conversaId) return null

  const { data, error } = await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .select(
      "id, valorCentavos, pdfUrl, nomeArquivo, respondidoEm, validoAte, resumoCaso"
    )
    .eq("contatoId", contatoId)
    .eq("conversaId", conversaId)
    .not("respondidoEm", "is", null)
    .is("canceladoEm", null)
    .gt("validoAte", new Date().toISOString())
    .order("respondidoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    // Falha de leitura NAO pode virar "tem orcamento": seguir sem ele apenas
    // refaz a qualificacao, enquanto o falso positivo anuncia valor errado.
    console.warn("[Orcamento] Falha ao consultar vigencia:", error.message)
    return null
  }

  if (!data) return null

  return {
    ...data,
    valorFormatado:
      data.valorCentavos != null ? formatarBrl(data.valorCentavos / 100) : null,
  }
}
