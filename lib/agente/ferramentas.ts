import type { ChatCompletionTool } from "openai/resources/chat/completions"

/** Definição das ferramentas do agente no formato OpenAI function calling.
 *  A Ana Júlia faz todo o data entry estruturado (nome, procedimento,
 *  sobreOPaciente, avanço de etapa) pela tool `atualizar_lead`. */
export const ferramentasAgente: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "consultar_paciente",
      description:
        "Busca dados do paciente pelo número de WhatsApp. Se não existir, cria um novo lead. Use sempre no início da conversa para obter contexto.",
      parameters: {
        type: "object",
        properties: {
          whatsapp: {
            type: "string",
            description: "Número de WhatsApp do paciente (apenas números, ex: 5511999998888)",
          },
        },
        required: ["whatsapp"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_lead",
      description:
        "Atualiza o cadastro do paciente e o funil. Chame SEMPRE que descobrir: o NOME do paciente (quando ele informa), o PROCEDIMENTO de interesse (quando ele diz o que quer fazer), um FATO relevante sobre ele (motivação, contexto, expectativa, restrição — vai pra sobreOPaciente em modo APPEND, nunca sobrescreve), OU quando a conversa amadurecer pra AVANÇAR a etapa do funil. Avanço de etapa: 'qualificacao' quando o paciente já disse o que quer (saiu do acolhimento); 'agendamento' quando ele está pronto pra marcar a avaliação. Use 'manter' (ou omita etapaCorreta) se nada mudou de etapa. NUNCA tente avançar pra 'consulta_agendada' por aqui — isso é exclusivo da tool registrar_agendamento. Pode chamar várias vezes ao longo da conversa; é idempotente e só grava o que realmente mudou.",
      parameters: {
        type: "object",
        properties: {
          contatoId: {
            type: "string",
            description: "ID do lead/paciente (do contexto)",
          },
          conversaId: {
            type: "string",
            description: "ID da conversa ativa (opcional)",
          },
          nome: {
            type: "string",
            description: "Nome do paciente, quando ele informar. Só sobrescreve nome genérico ('WhatsApp 55...').",
          },
          procedimentoInteresse: {
            type: "string",
            description: "Procedimento que o paciente demonstrou interesse (ex: 'lipo abdome', 'Paciente Modelo abdome + flancos').",
          },
          sobreOPacienteAdicionar: {
            type: "string",
            description: "Fato relevante sobre o paciente pra registrar no cadastro. É feito APPEND (nunca sobrescreve). Ex: 'Quer fazer antes do casamento em dezembro', 'Já fez lipo há 2 anos e quer retoque'.",
          },
          etapaCorreta: {
            type: "string",
            enum: ["manter", "qualificacao", "agendamento"],
            description: "Para onde mover o funil: 'qualificacao' (paciente já disse o que quer), 'agendamento' (pronto pra marcar) ou 'manter' (nada muda). NUNCA 'consulta_agendada'.",
          },
        },
        required: ["contatoId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gerar_orcamento",
      description:
        "Gera o ORÇAMENTO REAL (com PDF) do paciente — Caminho A. Chame SOMENTE quando TODAS estas condições estiverem satisfeitas: (1) qualificação completa = você sabe o PROCEDIMENTO desejado + a REGIÃO de maior incômodo + o paciente já MANDOU FOTO; (2) você já gerou interesse com os materiais de marketing; (3) você PERGUNTOU 'posso gerar um orçamento pra você?' e o paciente TOPOU. NÃO use pra quem só quer saber o preço aproximado e não quis qualificar — nesse caso use a FAIXA de consultar_procedimentos (Caminho B), sem PDF. Esta tool enfileira o pedido e aciona o Dr. Lucas, que define o valor; o orçamento em PDF chega pro paciente automaticamente depois — você NÃO envia nada agora nem promete prazo. Depois de chamar, responda algo curto e tranquilo tipo 'Show! Já tô preparando seu orçamento, em instantes te mando aqui.' (sem mencionar Dr. Lucas, sistema, fila ou espera longa). É idempotente — não duplica se já houver orçamento em andamento.",
      parameters: {
        type: "object",
        properties: {
          contatoId: {
            type: "string",
            description: "ID do lead/paciente (do contexto)",
          },
          conversaId: {
            type: "string",
            description: "ID da conversa ativa (do contexto)",
          },
          resumoCaso: {
            type: "string",
            description:
              "Resumo do caso pro Dr. Lucas decidir o valor: procedimento desejado + região de maior incômodo + nº de fotos recebidas. Ex: 'Lipo abdome + flancos. Incomoda mais a barriga baixa. 2 fotos enviadas.'",
          },
          prioridade: {
            type: "string",
            enum: ["normal", "urgente"],
            description:
              "Prioridade do orçamento. Use 'urgente' só se o paciente demonstrar pressa real (ex: data marcada, viagem). Default 'normal'.",
          },
        },
        required: ["contatoId", "resumoCaso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_mensagem",
      description:
        "Registra uma mensagem na conversa do paciente no banco de dados.",
      parameters: {
        type: "object",
        properties: {
          conversaId: {
            type: "string",
            description: "ID da conversa (opcional — se não fornecido, cria nova conversa)",
          },
          contatoId: {
            type: "string",
            description: "ID do lead/paciente",
          },
          conteudo: {
            type: "string",
            description: "Conteúdo da mensagem",
          },
          direcao: {
            type: "string",
            enum: ["paciente", "agente"],
            description: "Direção da mensagem: 'paciente' se recebida, 'agente' se enviada",
          },
          messageIdWhatsapp: {
            type: "string",
            description: "ID da mensagem no WhatsApp (opcional)",
          },
        },
        required: ["contatoId", "conteudo", "direcao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_conteudo",
      description:
        "Busca unificada de conteúdo da clínica: TEXTOS (políticas, pré/pós-operatório, sobre o Dr. Lucas, forma de pagamento, localização, cirurgiões parceiros) + MÍDIAS (fotos/vídeos antes-e-depois). Retorna { textos: [{titulo, conteudo}], midias: [{id, descricao, jaEnviada}] }. SEMPRE use antes de responder perguntas sobre clínica/Dr. Lucas/pós-op/pagamento OU quando o paciente pedir prova visual. Os textos retornados podem ser parafraseados na resposta. As mídias precisam ser enviadas via enviar_midia (não tente descrever sem enviar). Nunca invente — se retornar vazio em ambos, diga que o Dr. Lucas passa a info na avaliação.",
      parameters: {
        type: "object",
        properties: {
          filtro: {
            type: "string",
            description: "Palavra-chave do tema. Buscado em titulo+conteudo dos textos e na descricao das mídias (ilike). Ex: 'endereço', 'pagamento', 'glúteo', 'lipo abdome'. Deixe vazio pra retornar tudo.",
          },
          conversaId: {
            type: "string",
            description: "ID da conversa ativa (para calcular jaEnviada nas mídias).",
          },
        },
        required: ["conversaId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_procedimentos",
      description:
        "Consulta os procedimentos da clínica. Retorna por procedimento: nome, descricao, duracaoMin, posOperatorio, escopoOferta, parcelamento, faixaFormatada (string PRONTA pro Whats — ex: 'R$ 10k a R$ 12k'), valorBaseMinBrl/Max, temFaixaReal (true = Lucas definiu, false = calculo ±15% sobre legado), valorEstimadoBrl/Cheio (legado, NÃO citar). " +
        "POLÍTICA JLU-167 (25/05/2026): IA só fala FAIXA pra paciente, NUNCA valor fechado. Use SEMPRE `faixaFormatada` direto na mensagem, copie literal. Sempre completar com: 'O Dr. Lucas confirma o valor exato na avaliação online com base no seu caso.' Se faixaFormatada vier null, peça mais info ao paciente (foto + região) antes de citar qualquer valor.",
      parameters: {
        type: "object",
        properties: {
          filtro: {
            type: "string",
            description: "Filtro opcional por nome do procedimento (ilike). Ex: 'paciente modelo', 'abdome', 'lipo'.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_agenda",
      description:
        "Consulta os horários disponíveis para avaliação online (gratuita, 1h fixa) com o Dr. Lucas no Google Calendar, cruzando com o expediente da clínica (seg-sex 8h-18h, sáb 8h-12h). Retorna até 10 slots livres nos próximos 14 dias. SEMPRE use antes de propor horários ao paciente — nunca invente horário disponível. Se o paciente deu preferência ('semana que vem de manhã'), filtre os slots retornados antes de propor 2-3.",
      parameters: {
        type: "object",
        properties: {
          dataInicio: {
            type: "string",
            description: "Data início ISO 8601 (ex: 2026-04-22). Default: amanhã.",
          },
          dataFim: {
            type: "string",
            description: "Data fim ISO 8601. Default: dataInicio + 14 dias.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_agendamento",
      description:
        "Cria um agendamento de avaliação online (gratuita) para o paciente. Avança automaticamente o funil para 'consulta_agendada'. Email do paciente é OBRIGATÓRIO — sem ele o Google Calendar não envia o convite. Pergunte o email ANTES de chamar. Se o paciente recusar de primeira, insista educadamente uma ou duas vezes (\"é necessário pro convite chegar no seu calendário\"). Não chame esta tool sem email válido — o backend rejeita.",
      parameters: {
        type: "object",
        properties: {
          contatoId: {
            type: "string",
            description: "ID do lead/paciente",
          },
          conversaId: {
            type: "string",
            description: "ID da conversa ativa",
          },
          procedimentoId: {
            type: "string",
            description: "ID do procedimento (opcional). Se omitir, o backend tenta resolver via procedimentoInteresse do contato.",
          },
          dataHora: {
            type: "string",
            description: "Data e hora do agendamento no formato ISO 8601 (ex: 2026-03-20T14:00:00)",
          },
          observacao: {
            type: "string",
            description: "Observações adicionais (opcional)",
          },
          email: {
            type: "string",
            description: "Email do paciente — OBRIGATORIO. Usado pra mandar convite Google Calendar. Pergunte ao paciente antes de chamar a tool. Se ele recusar, insista educadamente.",
          },
        },
        required: ["contatoId", "conversaId", "dataHora", "email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_agendamento",
      description:
        "Remarca ou cancela um agendamento existente do paciente.",
      parameters: {
        type: "object",
        properties: {
          agendamentoId: {
            type: "string",
            description: "ID do agendamento",
          },
          acao: {
            type: "string",
            enum: ["remarcar", "cancelar"],
            description: "Ação a ser realizada: remarcar ou cancelar",
          },
          novaDataHora: {
            type: "string",
            description: "Nova data e hora (obrigatório se ação for 'remarcar'), formato ISO 8601",
          },
        },
        required: ["agendamentoId", "acao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enviar_midia",
      description:
        "Envia uma mídia específica para o paciente via WhatsApp. Passe o midiaId escolhido após ler o array `midias` retornado por buscar_conteudo. Prefira midias com jaEnviada: false.",
      parameters: {
        type: "object",
        properties: {
          contatoId: {
            type: "string",
            description: "ID do lead/paciente",
          },
          conversaId: {
            type: "string",
            description: "ID da conversa ativa",
          },
          midiaId: {
            type: "string",
            description: "ID da mídia escolhida (obtido via listar_midias).",
          },
        },
        required: ["contatoId", "conversaId", "midiaId"],
      },
    },
  },
]

/** Timeout maximo para execucao de uma ferramenta (evita agente travado) */
const TIMEOUT_FERRAMENTA_MS = 30_000

/** Executa uma ferramenta do agente via fetch interno com timeout de 30s */
export async function executarFerramenta(
  nome: string,
  args: Record<string, unknown>,
  baseUrl: string
): Promise<string> {
  const nomeRota = nome.replace(/_/g, "-")
  const url = `${baseUrl}/api/agente/${nomeRota}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_FERRAMENTA_MS)

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.API_SECRET || "",
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    })

    const data = await res.json()

    if (!res.ok) {
      // 4xx/5xx: a IA precisa de sinal CANONICO de falha pra nao alucinar
      // sucesso. Padronizamos { ok: false, error, httpStatus } pra ela
      // saber que a tool falhou e poder responder com graca ao paciente.
      const errorMsg =
        (data as { error?: string })?.error || `Falha HTTP ${res.status}`
      console.error(
        `[Ferramenta] ${nome} retornou HTTP ${res.status}: ${errorMsg}`
      )
      return JSON.stringify({
        ok: false,
        error: errorMsg,
        httpStatus: res.status,
      })
    }

    return JSON.stringify(data)
  } catch (error) {
    // Timeout / network / parse error: precisa devolver {ok:false} canonico
    // pra IA. Antes ficava {ok:true,status:"concluido"} e a IA alucinava
    // sucesso (mesmo bug do agendamento fantasma, em outro caminho).
    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        `[Ferramenta] ${nome} timeout apos ${TIMEOUT_FERRAMENTA_MS / 1000}s`
      )
      return JSON.stringify({
        ok: false,
        error: `Ferramenta excedeu tempo limite de ${TIMEOUT_FERRAMENTA_MS / 1000}s`,
        httpStatus: 504,
      })
    }
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Ferramenta] ${nome} erro:`, errorMsg)
    return JSON.stringify({
      ok: false,
      error: errorMsg,
      httpStatus: 500,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
