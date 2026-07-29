/**
 * Ordena o conteúdo da clínica por relevância para o modelo escolher.
 *
 * Incidente de 28/07/2026 (OPE-555): perguntado sobre o pós-operatório, a Ana
 * respondeu duas vezes que não tinha encontrado — e o registro estava
 * cadastrado, com quase 2 mil caracteres. A busca era `ilike` literal e falhava
 * por três motivos ao mesmo tempo:
 *
 *   1. acento — o título está gravado "pós operatorio", o modelo procurou
 *      "pós-operatório";
 *   2. hífen — mesma coisa, em outro caractere;
 *   3. frase inteira — `ilike '%pós-operatório da lipo fracionada%'` exige a
 *      sequência contígua, então nem o texto certo casava.
 *
 * A lição do João (29/07): *"esse busca de texto literal é complicado porque na
 * maioria das vezes não vai estar — é mais por interpretação. Todo procedimento
 * tem material de pós-operatório."* A relação entre a pergunta e o registro é
 * semântica, não textual. Casar string nunca vai cobrir isso.
 *
 * Por isso aqui não se FILTRA: ordena-se. Quem decide o que responde é o
 * modelo, que sabe interpretar — e a base da clínica é pequena o bastante para
 * caber inteira no contexto (4 registros, 2.756 caracteres em 29/07/2026). O
 * orçamento por caracteres existe só para o dia em que ela crescer.
 */

/** Teto de caracteres de conteúdo devolvido numa chamada. */
export const ORCAMENTO_CARACTERES = 12_000

function normalizar(texto: string | null | undefined): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Termos úteis do filtro. Palavras de 1-2 letras e conectivos não ajudam. */
function termosDoFiltro(filtro: string | null | undefined): string[] {
  const ignorar = new Set([
    "de", "da", "do", "das", "dos", "e", "ou", "em", "no", "na", "nos", "nas",
    "para", "pra", "por", "com", "sem", "um", "uma", "o", "a", "os", "as",
    "que", "qual", "como",
  ])

  return normalizar(filtro)
    .split(" ")
    .filter((termo) => termo.length >= 3 && !ignorar.has(termo))
}

export interface ItemRelevancia {
  /** Texto usado para pontuar (título + conteúdo, ou descrição da mídia). */
  textoParaBusca: string
  /** Custo em caracteres deste item no contexto do modelo. */
  peso: number
}

/**
 * Pontua pelo número de termos do filtro presentes no item. Termo que aparece
 * no começo (título) vale mais — é onde o assunto costuma estar nomeado.
 */
function pontuar(item: ItemRelevancia, termos: string[]): number {
  if (termos.length === 0) return 0

  const texto = normalizar(item.textoParaBusca)
  const inicio = texto.slice(0, 120)

  let score = 0
  for (const termo of termos) {
    if (!texto.includes(termo)) continue
    score += 2
    if (inicio.includes(termo)) score += 3
  }

  return score
}

/**
 * Devolve os itens ordenados por relevância, cortando pelo orçamento de
 * caracteres. Sem filtro, mantém a ordem original — a base inteira vai junto.
 *
 * Nunca devolve vazio por não ter casado nada: item irrelevante ainda é melhor
 * que a Ana dizer que não encontrou (foi o pior sintoma do incidente).
 */
export function ordenarPorRelevancia<T extends ItemRelevancia>(
  itens: T[],
  filtro: string | null | undefined,
  orcamento = ORCAMENTO_CARACTERES
): T[] {
  const termos = termosDoFiltro(filtro)

  const ordenados =
    termos.length === 0
      ? [...itens]
      : itens
          .map((item, indice) => ({ item, indice, score: pontuar(item, termos) }))
          .sort((a, b) => b.score - a.score || a.indice - b.indice)
          .map((entrada) => entrada.item)

  const selecionados: T[] = []
  let usado = 0

  for (const item of ordenados) {
    if (selecionados.length > 0 && usado + item.peso > orcamento) continue
    selecionados.push(item)
    usado += item.peso
  }

  return selecionados
}
