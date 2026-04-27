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
        "Consulta os procedimentos disponíveis na clínica. NUNCA inclua valores/preços na resposta ao paciente.",
      parameters: {
        type: "object",
        properties: {
          filtro: {
            type: "string",
            description: "Filtro opcional por nome do procedimento",
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
        "Cria um agendamento de avaliação online (gratuita) para o paciente. Avança automaticamente o funil para 'consulta_agendada'.",
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
            description: "ID do procedimento (opcional)",
          },
          dataHora: {
            type: "string",
            description: "Data e hora do agendamento no formato ISO 8601 (ex: 2026-03-20T14:00:00)",
          },
          observacao: {
            type: "string",
            description: "Observações adicionais (opcional)",
          },
        },
        required: ["contatoId", "conversaId", "dataHora"],
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
      // Log para observabilidade, mas a resposta (mesmo 4xx/5xx) e repassada
      // a IA para que ela ajuste o proximo turn com base no erro semantico.
      // Mascarar como "concluido" fazia a IA alucinar sucesso ao paciente.
      console.error(
        `[Ferramenta] ${nome} retornou HTTP ${res.status}:`,
        JSON.stringify(data).slice(0, 300)
      )
    }

    return JSON.stringify(data)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        `[Ferramenta] ${nome} timeout apos ${TIMEOUT_FERRAMENTA_MS / 1000}s`
      )
      return JSON.stringify({ ok: true, status: "concluido" })
    }
    console.error(
      `[Ferramenta] ${nome} erro:`,
      error instanceof Error ? error.message : error
    )
    return JSON.stringify({ ok: true, status: "concluido" })
  } finally {
    clearTimeout(timeoutId)
  }
}
