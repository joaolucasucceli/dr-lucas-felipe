import { openai } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { obterELimparBuffer } from "@/lib/agente/buffer"
import { obterMemoria, adicionarAMemoria } from "@/lib/agente/memoria"
import { gerarSystemPrompt } from "@/lib/agente/prompt"
import { ferramentasAgente, executarFerramenta } from "@/lib/agente/ferramentas"
import { enviarMensagem, enviarDigitando } from "@/lib/uazapi"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"

const MAX_TOOL_ITERATIONS = 10

/** Segmenta resposta longa em mensagens curtas para WhatsApp */
export function segmentarResposta(texto: string): string[] {
  if (!texto) return []

  // Split por parágrafo duplo (cada bloco vira uma mensagem)
  const blocos = texto.split(/\n\n+/).filter((b) => b.trim())

  const segmentos: string[] = []
  for (const bloco of blocos) {
    if (bloco.length <= 500) {
      segmentos.push(bloco.trim())
    } else {
      // Quebrar por sentenças
      const frases = bloco.split(/(?<=\.)\s+/)
      let atual = ""
      for (const frase of frases) {
        if (atual.length + frase.length > 500 && atual) {
          segmentos.push(atual.trim())
          atual = frase
        } else {
          atual = atual ? `${atual} ${frase}` : frase
        }
      }
      if (atual.trim()) segmentos.push(atual.trim())
    }
  }

  return segmentos.filter((s) => s.length > 0)
}

/** Extrai número do chatId (remoteJid) */
function extrairNumero(chatId: string): string {
  return chatId.split("@")[0]
}

/** Busca config WhatsApp ativa do banco */
async function obterConfigWhatsapp() {
  return prisma.configWhatsapp.findFirst({
    where: { ativo: true },
  })
}

/** Processa mensagens acumuladas no buffer e responde via GPT-4o */
export async function processarMensagens(chatId: string): Promise<void> {
  // 1. Obter mensagens do buffer
  const buffer = await obterELimparBuffer(chatId)
  if (buffer.length === 0) return

  // 2. Concatenar conteúdos
  const textoBuffer = buffer.map((m) => m.conteudo).join("\n")
  const whatsapp = extrairNumero(chatId)

  // 3. Obter config WhatsApp para envio
  const configWa = await obterConfigWhatsapp()
  if (!configWa?.instanceToken || !configWa?.uazapiUrl) {
    console.warn("[Agente] ConfigWhatsapp não encontrada ou incompleta — não será possível responder")
    return
  }

  // 4. Determinar baseUrl para chamadas internas
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  // 5. Consultar paciente para contexto
  let contextoLead: { nome?: string; procedimento?: string; etapa?: string; sobreOPaciente?: string } = {}
  let leadId: string | null = null
  let conversaId: string | null = null

  try {
    const resultadoPaciente = JSON.parse(
      await executarFerramenta("consultar_paciente", { whatsapp }, baseUrl)
    )
    if (resultadoPaciente.lead) {
      contextoLead = {
        nome: resultadoPaciente.lead.nome,
        procedimento: resultadoPaciente.lead.procedimentoInteresse,
        etapa: resultadoPaciente.lead.statusFunil,
        sobreOPaciente: resultadoPaciente.sobreOPaciente,
      }
      leadId = resultadoPaciente.lead.id
      conversaId = resultadoPaciente.conversa?.id || null
    }
  } catch (error) {
    console.error("[Agente] Erro ao consultar paciente:", error)
  }

  // 6. Enviar "digitando"
  try {
    await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, true)
  } catch {
    // Ignorar erro de digitação
  }

  try {
    // 7. Obter memória
    const memoria = await obterMemoria(chatId)

    // 8. Montar mensagens
    const systemPrompt = gerarSystemPrompt(contextoLead)
    const mensagens: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...memoria,
      { role: "user", content: textoBuffer },
    ]

    // 9. Chamar GPT-4o com function calling
    let resposta = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: mensagens,
      tools: ferramentasAgente,
      tool_choice: "auto",
    })

    // 10. Loop de tool calls
    let iteracoes = 0
    while (
      resposta.choices[0]?.message?.tool_calls &&
      resposta.choices[0].message.tool_calls.length > 0 &&
      iteracoes < MAX_TOOL_ITERATIONS
    ) {
      const toolCalls = resposta.choices[0].message.tool_calls

      // Adicionar a mensagem do assistente com tool_calls
      mensagens.push(resposta.choices[0].message)

      // Executar cada tool call
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue
        const fn = toolCall.function
        const args = JSON.parse(fn.arguments || "{}")
        const resultado = await executarFerramenta(
          fn.name,
          args,
          baseUrl
        )

        mensagens.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultado,
        })
      }

      // Re-chamar GPT-4o com resultados
      resposta = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: mensagens,
        tools: ferramentasAgente,
        tool_choice: "auto",
      })

      iteracoes++
    }

    // 11. Obter resposta final
    const textoResposta = resposta.choices[0]?.message?.content || ""
    if (!textoResposta) {
      console.warn("[Agente] GPT-4o retornou resposta vazia")
      return
    }

    // 12. Segmentar e enviar
    const segmentos = segmentarResposta(textoResposta)

    for (let i = 0; i < segmentos.length; i++) {
      const segmento = segmentos[i]

      // Enviar via Uazapi
      await enviarMensagem(
        configWa.uazapiUrl,
        configWa.instanceToken,
        whatsapp,
        segmento
      )

      // Registrar no banco
      if (leadId) {
        try {
          await executarFerramenta(
            "registrar_mensagem",
            {
              conversaId,
              leadId,
              conteudo: segmento,
              direcao: "agente",
            },
            baseUrl
          )
        } catch {
          // Não impedir envio se registro falhar
        }
      }

      // Delay de 1s entre mensagens (exceto última)
      if (i < segmentos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // 13. Salvar na memória
    await adicionarAMemoria(chatId, { role: "user", content: textoBuffer })
    await adicionarAMemoria(chatId, { role: "assistant", content: textoResposta })
  } catch (error) {
    console.error("[Agente] Erro no loop de resposta:", error)
  } finally {
    // 14. Parar "digitando"
    try {
      await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, false)
    } catch {
      // Ignorar
    }
  }
}
