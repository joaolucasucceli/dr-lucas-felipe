import { extrairRegioesDoTexto } from "@/lib/procedimentos/regioes"

/**
 * Detecta se a mensagem do paciente combina **pergunta explícita de valor** com
 * **pelo menos um sinal de complexidade** (caso fora do combo padrão Paciente
 * Modelo). Heurística determinística de transbordo (handoff) — sinaliza casos
 * que a Ana Júlia deve levar pra avaliação online em vez de chutar valor.
 *
 * Mantida como utilitário/safety net mesmo após a simplificação do produto.
 * (Antes alimentava a antiga tool de orçamento humano, hoje removida.)
 *
 * Critério (ambos têm que bater):
 *  A) pergunta explícita de valor (regex em PERGUNTA_VALOR)
 *  B) pelo menos UM destes sinais:
 *     - múltiplas regiões mencionadas que NÃO formam combo Paciente Modelo padrão
 *       (combo PM = só abdome / abdome+flancos / abdome+flancos+glúteo)
 *     - menção a região anatômica fora do PM (braços, costas, papada, mamas etc.)
 *     - "fora do paciente modelo / programa / combo padrão"
 *     - comparação externa de preço ("vi outras clínicas / outro lugar")
 *     - urgência ("decidir hoje", "preciso agora", "urgente")
 *
 * Falso positivo aqui é fricção leve no Dr. Lucas (recebe ping desnecessário no
 * WhatsApp). Falso negativo é dano à clínica (IA dá valor inventado ou fica
 * em silêncio). Sempre preferir falso positivo.
 */
const PERGUNTA_VALOR: RegExp[] = [
  /\bquanto\s+(custa|fica|sai|[ée])\b/i,
  /\bqual\s+(o\s+)?(valor|pre[çc]o|custo)\b/i,
  /\bme\s+(passa|passe|d[áa]|diz|fala|manda)\s+(o\s+)?(valor|pre[çc]o)\b/i,
  /\bvalor\s+(exato|certo|certinho|d[ao]|de)\b/i,
  /\bpre[çc]o\s+(exato|certo|certinho|d[ao]|de)\b/i,
  /\b(passa|passe|me\s+manda)\s+o\s+(valor|pre[çc]o)\b/i,
  /\bcusto\s+d[aoe]\b/i,
  /\bor[çc]amento\s+(d[aoe]|exato|certo|para|pra)\b/i,
]

const FORA_DO_PADRAO: RegExp[] = [
  /\bfora\s+(do|de)\s+(paciente\s+modelo|programa(\s+paciente)?|combo|padr[ãa]o)\b/i,
  /\bsem\s+(o\s+)?(programa|paciente\s+modelo)\b/i,
  /\bn[ãa]o\s+quero\s+(o\s+)?(paciente\s+modelo|programa)\b/i,
]

const COMPARACAO_EXTERNA: RegExp[] = [
  /\bvi\s+outr[ao]/i,
  /\boutras?\s+cl[ií]nicas?\b/i,
  /\boutro\s+lugar\b/i,
  /\bem\s+outra\s+cl[ií]nica\b/i,
  /\bcobrand?o?\s+r\$\s*\d/i,
]

const URGENCIA: RegExp[] = [
  /\bdecidir\s+(hoje|agora)\b/i,
  /\bhoje\s+mesmo\b/i,
  /\bpreciso\s+(saber\s+)?agora\b/i,
  /\burgent[ei]\b/i,
  /\bme\s+passa?\s+r[áa]pido\b/i,
]

/**
 * As regiões vêm de `src/lib/procedimentos/regioes.ts` — mesma lista usada pelo
 * cadastro de preço por região e pelo resumo enviado ao Dr. Lucas.
 */
function extrairRegioes(texto: string): {
  todas: Set<string>
  contemForaPM: boolean
} {
  const { chaves, temRegiaoForaDoProgramaModelo } = extrairRegioesDoTexto(texto)
  return { todas: new Set(chaves), contemForaPM: temRegiaoForaDoProgramaModelo }
}

/**
 * Combos Paciente Modelo padrão que CABEM na regra 1 (consultar_procedimentos
 * resolve com valorEstimadoBrl preenchido). Qualquer multi-região fora desses
 * combos é caso de handoff.
 */
function ehComboPacienteModelo(regioes: Set<string>): boolean {
  if (regioes.size === 1) return regioes.has("abdome")
  if (regioes.size === 2)
    return regioes.has("abdome") && regioes.has("flancos")
  if (regioes.size === 3)
    return (
      regioes.has("abdome") && regioes.has("flancos") && regioes.has("gluteo")
    )
  return false
}

export function detectarGatilhoHandoff(texto: string): boolean {
  if (!texto) return false

  const pediuValor = PERGUNTA_VALOR.some((re) => re.test(texto))
  if (!pediuValor) return false

  const { todas, contemForaPM } = extrairRegioes(texto)
  const multiRegiaoForaCombo =
    todas.size >= 2 && !ehComboPacienteModelo(todas)
  const foraDoPadrao = FORA_DO_PADRAO.some((re) => re.test(texto))
  const comparacaoExterna = COMPARACAO_EXTERNA.some((re) => re.test(texto))
  const urgencia = URGENCIA.some((re) => re.test(texto))

  return (
    multiRegiaoForaCombo ||
    contemForaPM ||
    foraDoPadrao ||
    comparacaoExterna ||
    urgencia
  )
}

/**
 * Quando o detector dispara mas o GPT-4o não passou um resumoCaso adequado,
 * geramos um fallback determinístico a partir da própria mensagem do paciente.
 * Mantém o schema de validação do endpoint (resumoCaso.min(10)) satisfeito sem
 * depender de o modelo escrever o resumo certo.
 */
export function gerarResumoFallback(texto: string): string {
  const { todas, contemForaPM } = extrairRegioes(texto)
  const regioesLista =
    todas.size > 0 ? Array.from(todas).join(" + ") : "região não identificada"
  const pediuComparacao = COMPARACAO_EXTERNA.some((re) => re.test(texto))
  const pediuUrgente = URGENCIA.some((re) => re.test(texto))
  const trecho = texto.length > 180 ? `${texto.slice(0, 180).trim()}...` : texto.trim()

  const flags: string[] = []
  if (contemForaPM) flags.push("região fora do Paciente Modelo")
  if (pediuComparacao) flags.push("comparou com outra clínica")
  if (pediuUrgente) flags.push("urgência declarada")

  const flagsTxt = flags.length > 0 ? ` (${flags.join(", ")})` : ""
  return `Paciente pediu valor para ${regioesLista}${flagsTxt}. Mensagem: "${trecho}"`
}
