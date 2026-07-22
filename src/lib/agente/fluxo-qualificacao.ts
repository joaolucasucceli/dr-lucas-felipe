/**
 * FONTE ÚNICA DE VERDADE do fluxo de qualificação da Ana Júlia.
 *
 * Por que este arquivo existe: até 22/07/2026 o fluxo comercial estava
 * codificado em DOIS lugares que se reforçavam — o script textual do
 * `prompt.ts` e ~20 funções determinísticas do `loop.ts`. Mudar uma pergunta
 * exigia tocar em dezenas de pontos, e qualquer ponto esquecido fazia a Ana
 * voltar a perguntar o que já tinha sido cortado. Foi essa duplicação que
 * produziu a "enrolação" reclamada pelo Dr. Lucas em 14/07/2026: 5 perguntas
 * fixas antes de pedir a foto.
 *
 * A partir daqui, o fluxo é DECLARADO uma vez em `ETAPAS_QUALIFICACAO` e
 * consumido por prompt.ts (texto do script) e loop.ts (fast-paths). Para
 * mudar o que a Ana pergunta antes do orçamento, edite APENAS este array.
 */

export const FATO_FOTO_QUALIFICACAO =
  "Foto atual da região recebida pelo WhatsApp."

/** Subconjunto de `ContextoContato` que descreve o estado de qualificação. */
export interface DadosQualificacao {
  procedimento?: string | null
  sobreOPaciente?: string | null
}

export function normalizarTextoBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}

interface FontesQualificacao {
  /** `sobreOPaciente` normalizado — onde os fatos coletados ficam salvos. */
  info: string
  /** `procedimento` normalizado. */
  procedimento: string
}

export interface EtapaQualificacao {
  chave: "regiao" | "foto"
  /** Como a etapa aparece na descrição do fluxo dentro do system prompt. */
  rotuloPrompt: string
  /** O dado já está no cadastro? */
  jaColetado: (fontes: FontesQualificacao) => boolean
  /** Pergunta determinística. `{nome}` é substituído pelo vocativo. */
  pergunta: string
  /**
   * A mesma pergunta como fragmento emendável ("Pra eu completar seu caso,
   * <continuacao>"). Existe como campo próprio porque derivar isso da
   * `pergunta` por regex quebrava sempre que a copy mudava.
   */
  continuacao: string
  /** A última mensagem da Ana (normalizada) pediu este dado? */
  perguntaFeita: (normalizado: string) => boolean
  /** Fato gravado no cadastro quando o paciente responde. */
  montarFato: (resposta: string) => string
}

const REGIOES_CONHECIDAS = [
  "abdomen",
  "abdome",
  "flancos",
  "papada",
  "culote",
  "axila",
  "costas",
]

/**
 * ORDEM É O FLUXO. Cortar uma etapa daqui a remove do prompt E dos
 * fast-paths ao mesmo tempo — nenhuma outra edição é necessária.
 *
 * Decisão de produto de 22/07/2026 (Dr. Lucas): o caminho até o orçamento é
 * região + foto. Tempo de incômodo, histórico de saúde e principal incômodo
 * saíram — eram perguntas que atrasavam o envio do caso sem mudar o valor
 * que o Dr. Lucas define. Ele avalia esse contexto na reunião de diagnóstico.
 */
export const ETAPAS_QUALIFICACAO: readonly EtapaQualificacao[] = [
  {
    chave: "regiao",
    rotuloPrompt: "região que o paciente quer tratar",
    jaColetado: ({ info, procedimento }) =>
      info.includes("regiao de interesse") ||
      info.includes("regiao do procedimento") ||
      info.includes("regiao de abdomen") ||
      info.includes("regiao de abdome") ||
      REGIOES_CONHECIDAS.some((regiao) => procedimento.includes(regiao)),
    pergunta: "Perfeito{nome}. Qual região do corpo você quer tratar?",
    continuacao: "qual região do corpo você quer tratar?",
    perguntaFeita: (normalizado) =>
      normalizado.includes("qual regiao") ||
      normalizado.includes("quais regioes") ||
      normalizado.includes("regioes do corpo") ||
      normalizado.includes("area especifica") ||
      normalizado.includes("regiao especifica") ||
      normalizado.includes("parte gostaria de tratar"),
    montarFato: (resposta) =>
      `Região de interesse informada pelo paciente: ${resposta.trim()}`,
  },
  {
    chave: "foto",
    rotuloPrompt: "foto atual da região",
    jaColetado: ({ info }) =>
      info.includes(normalizarTextoBusca(FATO_FOTO_QUALIFICACAO)),
    // A copy vem do próprio Dr. Lucas (áudio de 14/07/2026): a foto é
    // apresentada como o atalho para o valor, não como mais uma etapa.
    pergunta:
      "Perfeito{nome}. Normalmente eu consigo te passar o valor com uma foto da região pro Dr. Lucas analisar. Consegue me enviar uma foto atual?",
    continuacao:
      "consegue me enviar uma foto atual da região? Com ela o Dr. Lucas já define o valor certinho.",
    perguntaFeita: (normalizado) =>
      normalizado.includes("manda uma foto") ||
      normalizado.includes("mandar uma foto") ||
      normalizado.includes("enviar uma foto") ||
      normalizado.includes("consegue me enviar uma foto") ||
      normalizado.includes("foto atual da regiao") ||
      normalizado.includes("foto da regiao") ||
      normalizado.includes("uma foto da area"),
    montarFato: () => FATO_FOTO_QUALIFICACAO,
  },
]

function extrairFontes(dados: DadosQualificacao): FontesQualificacao {
  return {
    info: normalizarTextoBusca(dados.sobreOPaciente || ""),
    procedimento: normalizarTextoBusca(dados.procedimento || ""),
  }
}

export function temProcedimentoDefinido(dados: DadosQualificacao): boolean {
  const fontes = extrairFontes(dados)
  return Boolean(
    dados.procedimento ||
      fontes.procedimento ||
      fontes.info.includes("mini lipo") ||
      ETAPAS_QUALIFICACAO[0].jaColetado(fontes)
  )
}

/** Primeira etapa ainda não coletada, ou `null` quando o caso está completo. */
export function proximaEtapaPendente(
  dados: DadosQualificacao
): EtapaQualificacao | null {
  const fontes = extrairFontes(dados)
  return ETAPAS_QUALIFICACAO.find((etapa) => !etapa.jaColetado(fontes)) ?? null
}

/** O caso tem o mínimo para ir ao Dr. Lucas via `gerar_orcamento`? */
export function qualificacaoTemDadosMinimos(dados: DadosQualificacao): boolean {
  return temProcedimentoDefinido(dados) && proximaEtapaPendente(dados) === null
}

/** A última mensagem da Ana pediu algum dado de qualificação? */
export function assistentePediuDadoQualificacao(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  return ETAPAS_QUALIFICACAO.some((etapa) => etapa.perguntaFeita(normalizado))
}

/** Qual etapa a última mensagem da Ana pediu (para gravar o fato certo). */
export function etapaPerguntadaPeloAssistente(
  texto: string
): EtapaQualificacao | null {
  const normalizado = normalizarTextoBusca(texto)
  return (
    ETAPAS_QUALIFICACAO.find((etapa) => etapa.perguntaFeita(normalizado)) ?? null
  )
}

/** Descrição do fluxo injetada no system prompt — deriva do mesmo array. */
export function descreverEtapasParaPrompt(): string {
  return ETAPAS_QUALIFICACAO.map((etapa) => etapa.rotuloPrompt).join(" → ")
}
