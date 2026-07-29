/**
 * Última barreira antes de a Ana falar com o paciente.
 *
 * O script proíbe, com lista literal, três famílias de frase: fecho passivo de
 * plantão (regra 11c), relato de erro interno (regra #11) e anúncio de mídia
 * sem envio. Até 29/07/2026 tudo isso vivia só no prompt — e no teste do
 * Dr. Lucas de 28/07 **8 das 24 mensagens** terminaram com frase da lista
 * negra. Uma a cada três.
 *
 * Prompt é instrução, não garantia. GPT-4o volta ao padrão de call center
 * sempre que o contexto fica longo, e o nosso tem ~900 linhas. O que impede de
 * verdade é código no funil de saída — o mesmo lugar onde já moram o freio de
 * emergência e o `removerLinkDeArquivo`, para que qualquer caminho de envio
 * novo herde a proteção sem ninguém lembrar dela.
 *
 * Filosofia do arquivo: **remover, nunca reescrever**. Um validador que tenta
 * melhorar a frase vira um segundo autor e quebra o tom. Aqui só se apaga o que
 * é proibido e, se a mensagem ficar sem fecho, devolve-se a pergunta da etapa
 * pendente — que o fluxo já sabe qual é.
 */

const SEPARADOR_BLOCO = "\n---\n"

/**
 * Frases oficiais do sistema que contêm expressões parecidas com as proibidas,
 * mas são a copy correta e aprovada. Verificadas antes de qualquer regra.
 */
const COPY_OFICIAL: RegExp[] = [
  // Fecho pós-agendamento: posiciona a reunião e limita a disponibilidade à
  // logística. É o fecho que o próprio script manda usar.
  /precisar? remarcar ou cancelar/i,
  // Fecho pós-cancelamento — exceção única prevista no script. Precisa ser a
  // frase inteira: "Se mudar de ideia ou precisar de algo, estou por aqui" NÃO
  // é a exceção, é fecho passivo com outra roupa.
  /se mudar de ideia,?\s*(é|e)\s+s[óo]\s+me\s+chamar/i,
  // Transição para o orçamento: o sistema envia os resultados logo depois
  // desta mensagem (`enviarResultadosProcedimento`), então o anúncio é
  // cumprido. É a copy de `montarRespostaFotoQualificacaoCompleta`.
  /vou te mandar alguns resultados/i,
]

interface RegraSaida {
  nome: string
  padrao: RegExp
  /** Só se aplica quando a rodada NÃO teve mídia. */
  dependeDeMidia?: boolean
}

const REGRAS: RegraSaida[] = [
  // ── Fecho passivo de plantão (regra 11c) ────────────────────────────────
  {
    nome: "disposicao",
    padrao:
      /\b(fico|estou|estamos|ficamos|seguimos|to|tô)\s+(aqui\s+)?(à|a)\s+(sua\s+)?disposi[çc][ãa]o[^.!?]*/gi,
  },
  {
    nome: "por_aqui",
    padrao: /\b(estou|estamos|to|tô)\s+por\s+aqui[^.!?]*/gi,
  },
  {
    nome: "aqui_para_ajudar",
    padrao:
      /\b(estou|estamos)\s+aqui\s+(para|pra)\s+(te\s+)?(ajudar|o que precisar)[^.!?]*/gi,
  },
  {
    nome: "pode_contar",
    padrao: /\bpode\s+contar\s+com\s+(a\s+gente|nosco)[^.!?]*/gi,
  },
  {
    nome: "qualquer_duvida",
    padrao:
      /\b(qualquer\s+(d[úu]vida|coisa|outra\s+coisa)[^.!?]*(chamar|avisar|falar|perguntar)[^.!?]*)/gi,
  },
  {
    nome: "so_me_chamar",
    padrao: /\b([ée]\s+)?s[óo]\s+me\s+chamar[^.!?]*/gi,
  },
  {
    nome: "me_avisa_vago",
    // Só o "me avisa" vago. "Me avisa qual desses horários encaixa melhor?" é
    // pergunta concreta do próximo passo e não pode ser tocada — por isso as
    // alternativas são fechadas, e não um `[^.!?]*` solto.
    padrao:
      /\bme\s+avis[ae]\b(\s+(se|quando|qualquer)\b[^.!?]*|\s+que\s+(eu\s+)?(envio|mando|te\s+envio|te\s+mando)\b[^.!?]*|\s*,\s*t[áa]\s+bom\b[^.!?]*|\s*[.!])/gi,
  },

  // ── Erro interno (regra #11) ────────────────────────────────────────────
  {
    nome: "erro_interno",
    padrao:
      /[^.!?]*\b(houve\s+um\s+problema|probleminha|problema\s+t[ée]cnico|tive\s+(um\s+erro|uma\s+falha)|deu\s+erro|n[ãa]o\s+consegui\s+processar|erro\s+ao\s+(registrar|enviar|gerar))\b[^.!?]*/gi,
  },

  // ── Anúncio de ausência (OPE-555) ───────────────────────────────────────
  {
    nome: "nao_encontrei",
    padrao:
      /[^.!?]*\bn[ãa]o\s+(encontrei|localizei|achei|tenho\s+(essa|a)\s+informa[çc][ãa]o)\b[^.!?]*/gi,
  },
  {
    nome: "nos_registros",
    padrao: /\bnos\s+(nossos\s+)?registros\b/gi,
  },

  // ── Preâmbulo de qualificação (removido do fluxo em 22/07/2026) ─────────
  {
    nome: "preambulo_qualificacao",
    padrao:
      /[^.!?]*\b(posso\s+te\s+fazer\s+algumas\s+perguntas|vou\s+(s[óo]\s+)?confirmar\s+algumas\s+coisas)\b[^.!?]*/gi,
  },

  // ── Anúncio de mídia sem envio ──────────────────────────────────────────
  {
    nome: "anuncio_midia",
    dependeDeMidia: true,
    // Afirmação de envio no passado, com o objeto na mesma sentença.
    padrao:
      /[^.!?]*\b(enviei|mandei|estou\s+enviando|segue\s+(a|o))\b[^.!?]*\b(foto|fotos|imagem|imagens|v[íi]deo|resultado|resultados|exemplo|exemplos)\b[^.!?]*/gi,
  },
  {
    nome: "promessa_midia",
    dependeDeMidia: true,
    // Promessa de envio ("vou enviar agora para você dar uma olhada") — o
    // objeto costuma ter ficado na frase anterior, então não se exige a palavra
    // de mídia aqui. Envio do CASO ao Dr. Lucas é outra coisa e fica de fora.
    padrao:
      /[^.!?]*\b(vou|posso)\s+(te\s+)?(enviar|mandar|encaminhar)\b(?![^.!?]*\bpr[oa]\s+(o\s+)?(dr|doutor|ele)\b)[^.!?]*/gi,
  },
]

export interface ContextoSaida {
  /** A rodada enviou mídia, ou vai enviar logo após esta mensagem. */
  midiaNaRodada: boolean
  /** Pergunta da etapa pendente, usada quando a mensagem fica sem fecho. */
  perguntaDeContinuidade?: string | null
}

export interface ResultadoValidacao {
  texto: string
  /** Nomes das regras que removeram algo. Vazio = nada foi tocado. */
  bloqueios: string[]
}

function ehCopyOficial(bloco: string): boolean {
  return COPY_OFICIAL.some((padrao) => padrao.test(bloco))
}

/**
 * Divide em sentenças sem quebrar "Dr. Lucas".
 *
 * A primeira versão deste arquivo removia só o TRECHO proibido e deixava
 * restos: *"...região do corpo está interessado,!"*. Pior que a frase original.
 * A unidade de remoção passou a ser a sentença inteira.
 *
 * **A cola de dígito foi retirada na revisão de 29/07/2026.** Ela existia para
 * proteger "R$ 10.000,00", mas o `split` só corta onde o ponto é seguido de
 * ESPAÇO — e num decimal não é. Ou seja: a cola nunca protegeu valor nenhum, e
 * cobrava caro. Qualquer frase legítima terminada em dígito grudava na
 * seguinte, então uma frase proibida logo depois levava as duas embora:
 *
 *   "O valor foi de R$ 10.000,00. Caso tenha dúvida, é só me chamar!"
 *   → mensagem inteira apagada, em vez de sobrar a primeira frase.
 *
 * Apareceu passando as 50 mensagens reais da Ana pelo validador. Sobrou só o
 * caso que a cola de fato resolve: marcador de lista numerada ("1." sozinho).
 */
function dividirEmSentencas(texto: string): string[] {
  const partes = texto.split(/(?<=[.!?])\s+/)
  const sentencas: string[] = []

  for (const parte of partes) {
    const anterior = sentencas[sentencas.length - 1]
    const anteriorLimpo = anterior?.trim() ?? ""
    const ehAbreviacao = /\b(dr|dra|sr|sra|prof)\.$/i.test(anteriorLimpo)
    const ehMarcadorDeLista = /^\d+[.)]$/.test(anteriorLimpo)

    if (anterior && (ehAbreviacao || ehMarcadorDeLista)) {
      sentencas[sentencas.length - 1] = `${anterior} ${parte}`
      continue
    }
    sentencas.push(parte)
  }

  return sentencas
}

function terminaComPergunta(texto: string): boolean {
  return texto.trimEnd().endsWith("?")
}

/**
 * Remove do texto o que o script proíbe. Não reescreve nada: apaga a sentença
 * ofensora e, se o bloco inteiro era a frase proibida, apaga o bloco.
 */
export function validarSaida(
  texto: string,
  contexto: ContextoSaida
): ResultadoValidacao {
  if (!texto) return { texto, bloqueios: [] }

  const bloqueios = new Set<string>()

  const blocosLimpos = texto
    .split(SEPARADOR_BLOCO)
    .map((bloco) => {
      if (ehCopyOficial(bloco)) return bloco

      const mantidas = dividirEmSentencas(bloco).filter((sentenca) => {
        const regraQueCasa = REGRAS.find((regra) => {
          if (regra.dependeDeMidia && contexto.midiaNaRodada) return false
          regra.padrao.lastIndex = 0
          return regra.padrao.test(sentenca)
        })

        if (!regraQueCasa) return true

        bloqueios.add(regraQueCasa.nome)
        return false
      })

      return mantidas.join(" ").trim()
    })
    .filter((bloco) => bloco.trim().length > 0)

  if (bloqueios.size === 0) return { texto, bloqueios: [] }

  // Tudo era proibido: devolve a condução do fluxo em vez de silêncio.
  if (blocosLimpos.length === 0) {
    return {
      texto: contexto.perguntaDeContinuidade?.trim() || "",
      bloqueios: [...bloqueios],
    }
  }

  // Sobrou conteúdo, mas a mensagem perdeu o fecho. A regra do script é
  // terminar em pergunta concreta — devolvemos a da etapa pendente.
  const ultimo = blocosLimpos[blocosLimpos.length - 1]
  const perguntaExtra = contexto.perguntaDeContinuidade?.trim()
  if (
    perguntaExtra &&
    !terminaComPergunta(ultimo) &&
    !blocosLimpos.some((bloco) => terminaComPergunta(bloco))
  ) {
    blocosLimpos.push(perguntaExtra)
  }

  return { texto: blocosLimpos.join(SEPARADOR_BLOCO), bloqueios: [...bloqueios] }
}
