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
            description:
              "Número de WhatsApp do paciente (apenas números, ex: 5511999998888)",
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
        "Atualiza o cadastro do paciente e o funil. Chame SEMPRE que descobrir: o NOME do paciente, o PROCEDIMENTO de interesse, a REGIÃO, FOTO recebida ou um FATO relevante (motivação, objetivo, contexto, expectativa, restrição — vai pra sobreOPaciente em modo APPEND, nunca sobrescreve). Avanço de etapa: 'qualificacao' quando o paciente já disse o que quer; 'orcamento' quando a qualificação ficou completa e você vai acionar orçamento; 'agendamento' somente depois que o orçamento voltou e o paciente aprovou seguir para reunião. Use 'manter' (ou omita etapaCorreta) se nada mudou de etapa. NUNCA tente avançar pra 'consulta_agendada' por aqui — isso é exclusivo da tool registrar_agendamento. Pode chamar várias vezes; é idempotente e só grava o que realmente mudou.",
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
            description:
              "Nome do paciente, quando ele informar na conversa. Para lead de origem WhatsApp, substitui o nome de perfil cadastrado automaticamente.",
          },
          procedimentoInteresse: {
            type: "string",
            description:
              "Procedimento que o paciente demonstrou interesse (ex: 'lipo abdome', 'Paciente Modelo abdome + flancos').",
          },
          sobreOPacienteAdicionar: {
            type: "string",
            description:
              "Fato relevante sobre o paciente pra registrar no cadastro. É feito APPEND (nunca sobrescreve). Ex: 'Quer fazer antes do casamento em dezembro', 'Já fez lipo há 2 anos e quer retoque'.",
          },
          etapaCorreta: {
            type: "string",
            enum: ["manter", "qualificacao", "orcamento", "agendamento"],
            description:
              "Para onde mover o funil: 'qualificacao' (paciente já disse o que quer), 'orcamento' (qualificação completa e orçamento acionado), 'agendamento' (orçamento voltou e paciente aprovou reunião) ou 'manter' (nada muda). NUNCA 'consulta_agendada'.",
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
        "Gera o ORÇAMENTO EXATO do paciente com Dr. Lucas. Chame quando a qualificação estiver completa: procedimento desejado + região + objetivo/incômodo + foto recebida + paciente aceitou responder perguntas/seguir com orçamento. Não exija uma segunda autorização artificial se o paciente já aceitou a qualificação para orçamento. Esta tool só retorna ok quando a mensagem principal chegou ao Dr. Lucas; se falhar, não diga que enviou. Depois de ok, responda uma vez: 'Mandei seus dados para o Dr. Lucas e te devolvo por aqui assim que ele responder.' NÃO use para quem pediu só média e recusou qualificação/foto; nesse caso, use consultar_procedimentos apenas como faixa aproximada.",
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
      name: "acionar_atendimento_humano",
      description:
        "Pausa a IA e move o lead para Atendimento Humano quando o paciente pedir explicitamente para falar com uma pessoa, atendente, equipe ou Dr. Lucas. Não use para orçamento exato — orçamento usa gerar_orcamento.",
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
          motivo: {
            type: "string",
            description: "Resumo curto do motivo do pedido humano.",
          },
        },
        required: ["contatoId", "conversaId"],
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
            description:
              "ID da conversa (opcional — se não fornecido, cria nova conversa)",
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
            description:
              "Direção da mensagem: 'paciente' se recebida, 'agente' se enviada",
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
        "Busca unificada de conteúdo da clínica: TEXTOS (políticas, pré/pós-operatório, sobre o Dr. Lucas, forma de pagamento, localização, cirurgiões parceiros) + MÍDIAS (fotos/vídeos antes-e-depois). Retorna { textos: [{titulo, conteudo}], midias: [{id, descricao, jaEnviada}] }. Use antes de responder perguntas sobre clínica/Dr. Lucas/pós-op/pagamento, quando o paciente pedir prova visual, ou quando o procedimento já estiver identificado e você precisar ancorar valor com conteúdo/mídia. Os textos podem ser parafraseados. As mídias precisam ser enviadas via enviar_midia. Nunca invente — se retornar vazio, siga sem prometer mídia.",
      parameters: {
        type: "object",
        properties: {
          filtro: {
            type: "string",
            description:
              "Palavra-chave do tema. Buscado em titulo+conteudo dos textos e na descricao das mídias (ilike). Ex: 'endereço', 'pagamento', 'glúteo', 'lipo abdome'. Deixe vazio pra retornar tudo.",
          },
          conversaId: {
            type: "string",
            description:
              "ID da conversa ativa (para calcular jaEnviada nas mídias).",
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
        "Consulta os procedimentos da clínica. Retorna descrição, duração, pós-operatório, escopoOferta, parcelamento e faixaFormatada. Use para explicar o procedimento e, como fallback, para faixa aproximada quando o paciente pede média e recusa qualificação/foto. NÃO use para responder automaticamente com preço quando o paciente só informou a região. Valor exato só vem pelo fluxo gerar_orcamento + resposta do Dr. Lucas. Depois de enviar estimativa, ofereça o próximo caminho: perguntas para orçamento mais preciso ou reunião online. Se a estimativa for aprovada, pode seguir para consulta de agenda. Campos legados não devem ser citados.",
      parameters: {
        type: "object",
        properties: {
          filtro: {
            type: "string",
            description:
              "Filtro opcional por nome do procedimento (ilike). Ex: 'paciente modelo', 'abdome', 'lipo'.",
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
            description:
              "Data início ISO 8601 (ex: 2026-04-22). Default: amanhã.",
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
        "Cria um agendamento de avaliação online (gratuita) para o paciente. Avança automaticamente o funil para 'consulta_agendada'. Use somente depois de consultar a agenda, oferecer slots reais, o paciente escolher um slot e informar e-mail válido. Email do paciente é OBRIGATÓRIO — sem ele o Google Calendar não envia o convite. Se o paciente recusar de primeira, insista educadamente uma ou duas vezes (\"é necessário pro convite chegar no seu calendário\"). Não chame esta tool sem email válido — o backend rejeita.",
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
            description:
              "ID do procedimento (opcional). Se omitir, o backend tenta resolver via procedimentoInteresse do contato.",
          },
          dataHora: {
            type: "string",
            description:
              "Data e hora do agendamento no formato ISO 8601 (ex: 2026-03-20T14:00:00)",
          },
          observacao: {
            type: "string",
            description: "Observações adicionais (opcional)",
          },
          email: {
            type: "string",
            description:
              "Email do paciente — OBRIGATORIO. Usado pra mandar convite Google Calendar. Pergunte ao paciente antes de chamar a tool. Se ele recusar, insista educadamente.",
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
      description: "Remarca ou cancela um agendamento existente do paciente.",
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
            description:
              "Nova data e hora (obrigatório se ação for 'remarcar'), formato ISO 8601",
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
const TIMEOUT_FERRAMENTA_MS = 15_000

/** Executa uma ferramenta do agente via fetch interno com timeout curto */
export async function executarFerramenta(
  nome: string,
  args: Record<string, unknown>,
  baseUrl: string
): Promise<string> {
  const nomeRota = nome.replace(/_/g, "-")
  const url = `${baseUrl}/api/agente/${nomeRota}`
  const inicio = Date.now()
  console.log("[Ferramenta] inicio", { nome })

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

    console.log("[Ferramenta] fim", {
      nome,
      status: res.status,
      duracaoMs: Date.now() - inicio,
    })
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
