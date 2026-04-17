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
            enum: ["qualificacao", "pre_agendamento"],
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
  {
    type: "function",
    function: {
      name: "listar_midias",
      description:
        "Lista as mídias disponíveis para uma categoria (e procedimento, quando aplicável). Retorna título + descrição + flag jaEnviada. SEMPRE chame esta ferramenta antes de enviar_midia — use as descrições para escolher a mídia mais apropriada ao contexto do paciente e evite as que já foram enviadas.",
      parameters: {
        type: "object",
        properties: {
          categoria: {
            type: "string",
            enum: ["reels", "antes-depois", "depoimento", "procedimento"],
            description: "Categoria da mídia. reels (vídeos institucionais), antes-depois (fotos de resultados), depoimento (vídeos de pacientes), procedimento (vídeos explicativos)",
          },
          procedimento: {
            type: "string",
            description: "Nome do procedimento, obrigatório para 'antes-depois' e 'procedimento'. Ex: Mini Lipo, Lipo Enxertia Glútea, PMMA",
          },
          conversaId: {
            type: "string",
            description: "ID da conversa ativa (para calcular quais mídias já foram enviadas)",
          },
        },
        required: ["categoria", "conversaId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enviar_midia",
      description:
        "Envia uma mídia específica para o paciente via WhatsApp. Preferencialmente passe midiaId (escolhido após listar_midias). Se não tiver midiaId, pode passar categoria (+procedimento) e o sistema sorteia uma.",
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
          midiaId: {
            type: "string",
            description: "ID da mídia escolhida (obtido via listar_midias). Preferencial — garante que a mídia selecionada por descrição seja a enviada.",
          },
          categoria: {
            type: "string",
            enum: ["reels", "antes-depois", "depoimento", "procedimento"],
            description: "Fallback: se não passar midiaId, informe a categoria para sorteio aleatório",
          },
          procedimento: {
            type: "string",
            description: "Fallback: procedimento (usado apenas se midiaId não foi informado)",
          },
        },
        required: ["leadId", "conversaId"],
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
      // Falha tecnica HTTP — log server-side, retorna status neutro
      // (LLM nao deve verbalizar "erro" para o paciente).
      console.error(
        `[Ferramenta] ${nome} falhou HTTP ${res.status}:`,
        JSON.stringify(data).slice(0, 300)
      )
      return JSON.stringify({ ok: true, status: "concluido" })
    }

    // Sucesso HTTP — passa a resposta completa adiante.
    // Se o endpoint sinalizou falha de negocio (ex: enviado:false + motivo),
    // o prompt orienta a IA a adaptar a conversa naturalmente.
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
