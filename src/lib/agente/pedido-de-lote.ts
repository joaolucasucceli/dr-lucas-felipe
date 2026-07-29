/**
 * O paciente pediu o CONJUNTO de resultados, não mais um.
 *
 * Áudio do Dr. Lucas em 28/07/2026: *"tem que ficar pedindo pra ela enviar
 * (...) se tivesse como mandar tudo de uma vez, sem ficar pedindo pra ela —
 * tipo, 'ah, manda todos que tá lá'. É muito mais fácil."*
 *
 * E por escrito, no mesmo dia: *"Deixa pra ela mandar todos os antes e depois
 * que estão nos arquivos dela no sistema"*.
 *
 * O limite de uma mídia por rodada continua valendo no meio da conversa — é o
 * que evita a Ana despejar foto em cima de quem ainda está contando o caso.
 * Este detector existe só para o momento em que a pessoa pede o conjunto.
 */

import { normalizarTextoBusca } from "@/lib/agente/fluxo-qualificacao"

/** Quantas mídias saem quando o paciente pede o conjunto. */
export const LIMITE_LOTE_RESULTADOS = 6

const PEDIDOS_DE_LOTE = [
  "me envie todos",
  "me envia todos",
  "manda todos",
  "manda todas",
  "me manda todos",
  "me manda todas",
  "envia todos",
  "envia todas",
  "quero ver todos",
  "quero ver todas",
  "quero todos",
  "mostra todos",
  "mostra todas",
  "todos os resultados",
  "todas as fotos",
  "todos os antes e depois",
]

/**
 * Pedidos de MAIS, que também abrem o lote — "teria mais resultados?" foi
 * exatamente o que o Dr. Lucas escreveu antes de "me envie todos".
 */
const PEDIDOS_DE_MAIS = [
  "tem mais",
  "teria mais",
  "tem outros",
  "tem outras",
  "mais resultados",
  "mais fotos",
  "mais exemplos",
  "mais algum",
  "outros exemplos",
  "outros casos",
]

/**
 * O texto pede o conjunto de resultados?
 *
 * `contextoVisual` diz se a conversa já está falando de foto/resultado. Ele
 * existe porque "tem mais?" sozinho é ambíguo: pode ser sobre horários,
 * procedimentos ou formas de pagamento. Sem contexto visual, só os pedidos
 * explícitos ("me envie todos") abrem o lote.
 */
export function ehPedidoDeLoteDeResultados(
  texto: string,
  contextoVisual: boolean
): boolean {
  const normalizado = normalizarTextoBusca(texto)
  if (!normalizado) return false

  if (PEDIDOS_DE_LOTE.some((termo) => normalizado.includes(termo))) return true

  if (!contextoVisual) return false

  return PEDIDOS_DE_MAIS.some((termo) => normalizado.includes(termo))
}
