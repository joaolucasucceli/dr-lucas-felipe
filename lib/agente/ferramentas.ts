import type { ChatCompletionTool } from "openai/resources/chat/completions"

/** Definição das 6 ferramentas do agente no formato OpenAI function calling */
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
          leadId: {
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
        required: ["leadId", "conteudo", "direcao"],
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
      name: "salvar_qualificacao",
      description:
        "Salva informações de qualificação do paciente. Se o lead estiver em 'acolhimento', avança automaticamente para 'qualificacao'. Também atualiza o nome do lead se informado via nomePaciente. Use sempre que coletar informações novas.",
      parameters: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "ID do lead/paciente",
          },
          conversaId: {
            type: "string",
            description: "ID da conversa ativa",
          },
          sobreOPaciente: {
            type: "string",
            description: "Informações coletadas sobre o paciente (será adicionado ao histórico, nunca sobrescrito)",
          },
          procedimentoInteresse: {
            type: "string",
            description: "Procedimento de interesse do paciente (opcional)",
          },
          nomePaciente: {
            type: "string",
            description: "Nome real do paciente, informado por ele na conversa. Atualiza o nome do lead se o atual é genérico.",
          },
          avancarPara: {
            type: "string",
            enum: ["qualificacao", "agendamento"],
            description: "Avança a etapa do funil. Use 'agendamento' quando a qualificação estiver completa e for hora de agendar a consulta.",
          },
        },
        required: ["leadId", "conversaId", "sobreOPaciente"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_agendamento",
      description:
        "Cria um agendamento de consulta para o paciente. Avança automaticamente o funil para 'consulta_agendada'.",
      parameters: {
        type: "object",
        properties: {
          leadId: {
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
        required: ["leadId", "conversaId", "dataHora"],
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
]

/** Executa uma ferramenta do agente via fetch interno */
export async function executarFerramenta(
  nome: string,
  args: Record<string, unknown>,
  baseUrl: string
): Promise<string> {
  const nomeRota = nome.replace(/_/g, "-")
  const url = `${baseUrl}/api/agente/${nomeRota}`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.API_SECRET || "",
      },
      body: JSON.stringify(args),
    })

    const data = await res.json()

    if (!res.ok) {
      return JSON.stringify({ erro: data.error || `Erro ${res.status}` })
    }

    return JSON.stringify(data)
  } catch (error) {
    return JSON.stringify({
      erro: error instanceof Error ? error.message : "Erro ao executar ferramenta",
    })
  }
}
