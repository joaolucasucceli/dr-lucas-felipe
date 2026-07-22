import { supabaseAdmin } from "@/lib/supabase"
import { extrairRegioesDoTexto, rotuloRegiao } from "@/lib/procedimentos/regioes"

/**
 * Faixa de valor das regiões que o paciente mencionou, para o Dr. Lucas
 * consultar na hora de responder o orçamento.
 *
 * Este é o ÚNICO consumidor de preço por região no fluxo do agente, e ele
 * escreve para o WhatsApp do Dr. Lucas — nunca para o paciente. A Ana Júlia não
 * tem acesso a estes valores (`consultar_procedimentos` não retorna preço desde
 * 22/07/2026).
 */

function formatarBrl(valor: number): string {
  return (
    valor
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      })
      // Intl usa espaço não-quebrável (U+00A0) entre "R$" e o número. No
      // WhatsApp isso aparece como caractere estranho em alguns clientes.
      .replace(/\u00a0/g, " ")
  )
}

export interface FaixaRegiaoLida {
  regiao: string
  valorMinBrl: number | string
  valorMaxBrl: number | string
  observacao?: string | null
}

/**
 * Parte pura da montagem — separada do acesso ao banco para ser testável.
 * `chaves` preserva a ordem em que o paciente citou as regiões.
 */
export function formatarReferenciaValor(
  faixas: FaixaRegiaoLida[],
  chaves: string[]
): string | null {
  if (faixas.length === 0) return null

  const linhas = [...faixas]
    .sort((a, b) => chaves.indexOf(a.regiao) - chaves.indexOf(b.regiao))
    .map((faixa) => {
      const valores = `${formatarBrl(Number(faixa.valorMinBrl))} a ${formatarBrl(Number(faixa.valorMaxBrl))}`
      const obs = faixa.observacao ? ` (${faixa.observacao})` : ""
      return `${rotuloRegiao(faixa.regiao)}: ${valores}${obs}`
    })

  const semCadastro = chaves.filter(
    (chave) => !faixas.some((faixa) => faixa.regiao === chave)
  )
  if (semCadastro.length > 0) {
    linhas.push(
      `Sem faixa cadastrada: ${semCadastro.map(rotuloRegiao).join(", ")}`
    )
  }

  return linhas.join("\n")
}

/**
 * Monta as linhas de referência de valor a partir do que o paciente falou.
 * Retorna `null` quando não há região identificada ou nenhuma delas tem faixa
 * cadastrada — nesse caso o Dr. Lucas simplesmente não vê a seção, em vez de
 * receber um valor que não corresponde ao caso.
 */
export async function montarReferenciaValorPorRegiao(params: {
  procedimentoId?: string | null
  textoParaExtrairRegioes: string
}): Promise<string | null> {
  const { procedimentoId, textoParaExtrairRegioes } = params
  if (!procedimentoId) return null

  const { chaves } = extrairRegioesDoTexto(textoParaExtrairRegioes)
  if (chaves.length === 0) return null

  const { data, error } = await supabaseAdmin
    .from("procedimento_regioes")
    .select('regiao, "valorMinBrl", "valorMaxBrl", observacao')
    .eq("procedimentoId", procedimentoId)
    .eq("ativo", true)
    .is("deletadoEm", null)
    .in("regiao", chaves)

  if (error) {
    console.warn(
      "[faixa-regiao] Falha ao buscar faixa por regiao:",
      error.message
    )
    return null
  }

  return formatarReferenciaValor(data ?? [], chaves)
}
