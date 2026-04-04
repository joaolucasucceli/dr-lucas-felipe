import { openai } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { obterELimparBuffer } from "@/lib/agente/buffer"
import { obterMemoria, adicionarAMemoria } from "@/lib/agente/memoria"
import { gerarSystemPrompt } from "@/lib/agente/prompt"
import { ferramentasAgente, executarFerramenta } from "@/lib/agente/ferramentas"
import { abrirNovoCiclo } from "@/lib/agente/kanban-sync"
import { enviarMensagem, enviarDigitando } from "@/lib/uazapi"
// Transições de etapa agora são feitas diretamente nas ferramentas
// (salvar_qualificacao → qualificacao, registrar_agendamento → consulta_agendada)
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"

const MAX_TOOL_ITERATIONS = 10

/** Statuses em que a IA fica em silêncio — humano está conduzindo */
const STATUSES_SILENCIO = ["consulta_realizada", "sinal_pago", "procedimento_agendado"]

/** Statuses que indicam paciente retornando — IA abre novo ciclo */
const STATUSES_RETORNO = ["concluido", "perdido", "arquivado"]

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
  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()

  // 5. Consultar paciente para contexto
  let contextoLead: {
    nome?: string
    procedimento?: string
    etapa?: string
    sobreOPaciente?: string
    ehRetorno?: boolean
    cicloAtual?: number
    ciclosCompletos?: number
    ultimoProcedimento?: string | null
  } = {}
  let leadId: string | null = null
  let conversaId: string | null = null

  try {
    const resultadoPaciente = JSON.parse(
      await executarFerramenta("consultar_paciente", { whatsapp }, baseUrl)
    )
    if (resultadoPaciente.lead) {
      const statusAtual: string = resultadoPaciente.lead.statusFunil

      // 5a. Silêncio: humano está conduzindo — IA não responde
      if (STATUSES_SILENCIO.includes(statusAtual)) {
        return
      }

      // 5b. Retorno: paciente voltou após concluido/perdido — abrir novo ciclo
      if (STATUSES_RETORNO.includes(statusAtual)) {
        try {
          const novoCiclo = await abrirNovoCiclo(resultadoPaciente.lead.id)
          conversaId = novoCiclo.conversaId
          // Rebuscar dados atualizados do lead
          const leadAtualizado = JSON.parse(
            await executarFerramenta("consultar_paciente", { whatsapp }, baseUrl)
          )
          if (leadAtualizado.lead) {
            contextoLead = {
              nome: leadAtualizado.lead.nome,
              procedimento: leadAtualizado.lead.procedimentoInteresse,
              etapa: leadAtualizado.lead.statusFunil,
              sobreOPaciente: leadAtualizado.sobreOPaciente,
              ehRetorno: true,
              cicloAtual: leadAtualizado.lead.cicloAtual,
              ciclosCompletos: leadAtualizado.lead.ciclosCompletos,
              ultimoProcedimento: leadAtualizado.ultimoProcedimento,
            }
            leadId = leadAtualizado.lead.id
          }
        } catch (err) {
          console.error("[Agente] Erro ao abrir novo ciclo:", err)
          // Se falhar abertura de ciclo, continua com dados originais
          contextoLead = {
            nome: resultadoPaciente.lead.nome,
            procedimento: resultadoPaciente.lead.procedimentoInteresse,
            etapa: resultadoPaciente.lead.statusFunil,
            sobreOPaciente: resultadoPaciente.sobreOPaciente,
          }
          leadId = resultadoPaciente.lead.id
          conversaId = resultadoPaciente.conversa?.id || null
        }
      } else {
        // 5c. Fluxo normal (colunas 1–4)
        // Só incluir nome no contexto se já foi confirmado pelo paciente
        // (sobreOPaciente contém dados coletados → paciente já informou nome)
        const nomeConfirmado = resultadoPaciente.sobreOPaciente
          ? resultadoPaciente.lead.nome
          : undefined
        contextoLead = {
          nome: nomeConfirmado,
          procedimento: resultadoPaciente.lead.procedimentoInteresse,
          etapa: resultadoPaciente.lead.statusFunil,
          sobreOPaciente: resultadoPaciente.sobreOPaciente,
          ehRetorno: resultadoPaciente.lead.ehRetorno,
          cicloAtual: resultadoPaciente.lead.cicloAtual,
          ciclosCompletos: resultadoPaciente.lead.ciclosCompletos,
          ultimoProcedimento: resultadoPaciente.ultimoProcedimento,
        }
        leadId = resultadoPaciente.lead.id
        conversaId = resultadoPaciente.conversa?.id || null
      }
    }
  } catch (error) {
    console.error("[Agente] Erro ao consultar paciente:", error)
  }

  // 5d. Checar modo de conversa — se humano está atendendo, IA não responde
  if (conversaId) {
    const conversa = await prisma.conversa.findUnique({
      where: { id: conversaId },
      select: { modoConversa: true },
    })
    if (conversa?.modoConversa === "humano") {
      console.log(`[Agente] Conversa ${conversaId} em modo humano — IA não responde`)
      return
    }
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

      // Delay aleatório de 3-5s entre mensagens (exceto última)
      if (i < segmentos.length - 1) {
        const delay = Math.floor(Math.random() * 2001) + 3000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    // 13. Salvar na memória
    await adicionarAMemoria(chatId, { role: "user", content: textoBuffer })
    await adicionarAMemoria(chatId, { role: "assistant", content: textoResposta })

    // Transições de etapa são feitas pelas ferramentas:
    // salvar_qualificacao → acolhimento → qualificacao
    // registrar_agendamento → qualquer → consulta_agendada
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
