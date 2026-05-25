import type { ChatCompletionTool } from "openai/resources/chat/completions"

/** Definição das ferramentas do agente no formato OpenAI function calling.
 *  Data entry estruturada (nome, procedimento, sobreOPaciente, avanço de etapa)
 *  é feita pela Analista IA (JLAU-571), não pela Ana Júlia. */
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
      name: "confirmar_agendamento",
      description:
        "Marca um agendamento como CONFIRMADO. Use quando o paciente responder positivamente (Sim, Confirmo, OK, Pode confirmar, Tô confirmando) a um lembrete de presença que VOCÊ enviou. O ID do agendamento pendente está no contexto do paciente (agendamentoPendenteId). Não use sem ID válido — se não houver agendamento pendente no contexto, ignore.",
      parameters: {
        type: "object",
        properties: {
          agendamentoId: {
            type: "string",
            description: "ID do agendamento pendente (vem de agendamentoPendenteId no contexto)",
          },
        },
        required: ["agendamentoId"],
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
      name: "solicitar_orcamento_humano",
      description:
        "Pausa o atendimento e sinaliza o Dr. Lucas pra responder o orçamento direto, do número pessoal dele. Use SOMENTE quando o paciente: (a) já mandou pelo menos 1 foto + região, e perguntou explicitamente o valor; OU (b) está qualificado mas insistiu em valor 2× depois de você redirecionar pra avaliação. Depois de chamar essa tool, NÃO mande mais mensagem nesse turno — o Dr. Lucas vai falar direto. O paciente fica aguardando até ele responder. Você só volta a atender quando o webhook detectar a mensagem dele.",
      parameters: {
        type: "object",
        properties: {
          contatoId: {
            type: "string",
            description: "ID do contato (vem do contexto após consultar_paciente)",
          },
          conversaId: {
            type: "string",
            description: "ID da conversa ativa (opcional)",
          },
          resumoCaso: {
            type: "string",
            description:
              "Resumo CURTO do caso pro Dr. Lucas: região do corpo, fotos enviadas (sim/quantas), demanda. Máximo 3 linhas. Ex: 'Abdômen + flancos, 2 fotos enviadas. Quer saber valor pra mini lipo paciente modelo.'",
          },
          prioridade: {
            type: "string",
            enum: ["normal", "urgente"],
            description: "Default 'normal'. 'urgente' só se o paciente sinalizou objeção clara.",
          },
        },
        required: ["contatoId", "resumoCaso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirmar_presenca",
      description:
        "Marca um agendamento como REALIZADO (paciente compareceu na avaliação) e ENCERRA a conversa — você para de responder definitivamente nesse contato. Use SOMENTE quando o paciente responder positivamente (Sim, Foi, Compareci, Foi tudo certo, Sim fiz, Sim, fez) a uma pergunta SUA de pós-evento ('Conseguiu fazer a avaliação hoje?'). O ID está em agendamentoPosEventoId no contexto. Sem ID válido no contexto, ignore.",
      parameters: {
        type: "object",
        properties: {
          agendamentoId: {
            type: "string",
            description: "ID do agendamento (vem de agendamentoPosEventoId no contexto)",
          },
        },
        required: ["agendamentoId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marcar_nao_compareceu",
      description:
        "Marca um agendamento como NÃO COMPARECIDO (paciente faltou na avaliação). NÃO encerra a conversa — depois de chamar essa tool, ofereça remarcar para uma nova data via consultar_agenda + atualizar_agendamento. Use SOMENTE quando o paciente responder negativamente (Não, Não fui, Não consegui, Não deu, Faltei) a pergunta SUA de pós-evento. O ID está em agendamentoPosEventoId no contexto. Sem ID válido no contexto, ignore.",
      parameters: {
        type: "object",
        properties: {
          agendamentoId: {
            type: "string",
            description: "ID do agendamento (vem de agendamentoPosEventoId no contexto)",
          },
        },
        required: ["agendamentoId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "solicitar_aprovacao_horario",
      description:
        "JLU-170 v2: Cria solicitacao de pre-aprovacao de horario com o gestor (Dr. Lucas). USE SOMENTE quando o contexto indicar `config.exigirAprovacaoAgendamento === true` (gestor configurou a flag em /configuracoes/comportamento-ia). Em vez de registrar_agendamento direto, voce cria uma SOLICITACAO que vai pro WhatsApp pessoal do gestor. Ele aprova/sugere outro/cancela via painel. So depois voce responde o paciente. Apos chamar essa tool, mande ao paciente: \"[nome], vou so alinhar com o Dr. Lucas pra confirmar esse horario, te respondo em algumas horas pode ser?\" — e FIQUE EM SILENCIO neste contato ate webhook detectar resposta da decisao do gestor. Idempotente: chamadas duplicadas com mesmo contatoId+dataHora retornam jaPendente=true.",
      parameters: {
        type: "object",
        properties: {
          contatoId: { type: "string", description: "ID do paciente" },
          conversaId: { type: "string", description: "ID da conversa ativa" },
          dataHora: { type: "string", description: "Data/hora ISO 8601 com timezone (mesmo formato de registrar_agendamento)" },
          procedimentoId: { type: "string", description: "ID do procedimento (opcional)" },
          email: { type: "string", description: "Email do paciente (OBRIGATORIO — mesmo motivo de registrar_agendamento)" },
          observacao: { type: "string", description: "Observacao curta (opcional)" },
        },
        required: ["contatoId", "dataHora", "email"],
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
