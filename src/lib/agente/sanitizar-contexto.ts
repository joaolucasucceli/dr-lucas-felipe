/**
 * Última barreira antes de texto livre do banco virar contexto da Ana Júlia.
 *
 * Incidente de 28/07/2026 (OPE-550) que motivou este arquivo: a Ana respondeu
 * "o valor foi de R$ 10.000,00" num atendimento em que ninguém pediu orçamento.
 * O número não veio da tool nem do modelo inventando — veio de uma anotação que
 * o próprio sistema grava em `contatos.sobreOPaciente` quando o Dr. Lucas
 * responde um valor:
 *
 *   "Orcamento enviado ao paciente: R$ 10.000,00 em 24/07/2026, 21:52. PDF: https://..."
 *
 * Esse campo inteiro é entregue ao modelo como "Informações já coletadas"
 * (`prompt.ts`). A anotação nasceu para humano ler no painel e virou contexto
 * da IA sem ninguém decidir isso.
 *
 * `src/lib/orcamento/vigencia.ts` já é a fonte única de "existe orçamento
 * valendo neste atendimento" e funcionou corretamente naquele dia — recusou o
 * orçamento antigo. O valor passou por baixo dela, por um campo de texto. Por
 * isso a defesa aqui é de borda: nenhuma anotação chega ao modelo sem passar.
 *
 * O que NÃO é filtrado, de propósito: valor que o próprio paciente mencionou
 * ("meu limite é R$ 5.000"). Isso é contexto legítimo do caso e continua
 * valendo. O alvo são as anotações que o sistema escreve.
 *
 * O painel, o PDF e a mensagem que o Dr. Lucas recebe leem `sobreOPaciente`
 * direto do banco e continuam vendo o texto completo — este filtro vale só
 * para o caminho do agente (`/api/agente/consultar-paciente`).
 */

const SEPARADOR_NOTAS = "\n---\n"

/**
 * Anotações escritas pelo sistema que carregam valor ou endereço de arquivo.
 * Segmento que casa é removido inteiro — não há parte aproveitável nele para o
 * modelo, e o dado real vive em `eventos_orcamento_pendente` / `anexos_contato`.
 */
const NOTAS_DE_ORCAMENTO = /^\s*or[çc]amento\s+(enviado|respondido|gerado)/i

/** Qualquer endereço http(s). O modelo nunca precisa de link no contexto. */
const URL = /\bhttps?:\/\/\S+/gi

/**
 * Remove do texto de anotações o que não pode chegar ao modelo.
 *
 * Devolve `null` quando não sobra nada — o chamador trata igual a "sem
 * anotações", que é o estado normal de um lead novo.
 */
export function sanitizarSobreOPaciente(
  texto: string | null | undefined
): string | null {
  if (!texto) return null

  const segmentosLimpos = texto
    .split(SEPARADOR_NOTAS)
    .filter((segmento) => !NOTAS_DE_ORCAMENTO.test(segmento))
    .map((segmento) => segmento.replace(URL, "").replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean)

  if (segmentosLimpos.length === 0) return null

  const limpo = segmentosLimpos.join(SEPARADOR_NOTAS)

  if (limpo !== texto.trim()) {
    console.log("[sanitizar-contexto] Anotação filtrada antes de ir ao modelo", {
      segmentosOriginais: texto.split(SEPARADOR_NOTAS).length,
      segmentosMantidos: segmentosLimpos.length,
    })
  }

  return limpo
}
