import { openai } from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase"
import { obterELimparBuffer } from "@/lib/agente/buffer"
import { obterMemoria, adicionarAMemoria } from "@/lib/agente/memoria"
import { gerarSystemPrompt } from "@/lib/agente/prompt"
import { ferramentasAgente, executarFerramenta } from "@/lib/agente/ferramentas"
import { detectarGatilhoMidia } from "@/lib/agente/gatilho-midia"
import { abrirNovoCiclo } from "@/lib/agente/kanban-sync"
import { analisarConversa } from "@/lib/agente/analista"
import { enviarMensagem, enviarDigitando } from "@/lib/uazapi"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"

const MAX_TOOL_ITERATIONS = 10

const STATUSES_SILENCIO: string[] = []
const STATUSES_RETORNO: string[] = []

export function segmentarResposta(texto: string): string[] {
  if (!texto) return []

  if (texto.includes("---")) {
    const segmentos = texto
      .split(/\n?---\n?/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (segmentos.length > 1) return segmentos
  }

  const blocos = texto.split(/\n\n+/).filter((b) => b.trim())

  const segmentos: string[] = []
  for (const bloco of blocos) {
    if (bloco.length <= 500) {
      segmentos.push(bloco.trim())
    } else {
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

function extrairNumero(chatId: string): string {
  return chatId.split("@")[0]
}

async function obterConfigWhatsapp() {
  const { data } = await supabaseAdmin
    .from("config_whatsapp")
    .select("*")
    .eq("ativo", true)
    .maybeSingle()
  return data
}

export async function processarMensagens(chatId: string): Promise<void> {
  const buffer = await obterELimparBuffer(chatId)
  if (buffer.length === 0) return

  const textoBuffer = buffer.map((m) => m.conteudo).join("\n")
  const whatsapp = extrairNumero(chatId)

  const configWa = await obterConfigWhatsapp()
  if (!configWa?.instanceToken || !configWa?.uazapiUrl) {
    console.warn("[Agente] ConfigWhatsapp não encontrada ou incompleta — não será possível responder")
    return
  }

  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()

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

      if (STATUSES_SILENCIO.includes(statusAtual)) {
        return
      }

      if (STATUSES_RETORNO.includes(statusAtual)) {
        try {
          const novoCiclo = await abrirNovoCiclo(resultadoPaciente.lead.id)
          conversaId = novoCiclo.conversaId
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

  if (leadId) {
    const { data: usuarioIa } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("tipo", "ia")
      .eq("ativo", true)
      .is("deletadoEm", null)
      .maybeSingle()

    if (usuarioIa) {
      const { data: leadAtual } = await supabaseAdmin
        .from("leads")
        .select("responsavelId")
        .eq("id", leadId)
        .maybeSingle()

      if (leadAtual?.responsavelId && leadAtual.responsavelId !== usuarioIa.id) {
        console.log(`[Agente] IA não é responsável pelo lead ${leadId} — não responde`)
        return
      }
    }
  }

  if (conversaId) {
    const { data: conversa } = await supabaseAdmin
      .from("conversas")
      .select("modoConversa")
      .eq("id", conversaId)
      .maybeSingle()

    if (conversa?.modoConversa === "humano") {
      console.error(`[Agente] Conversa ${conversaId} em modo humano — IA não responde`)
      return
    }
  }

  try {
    await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, true)
  } catch {
    console.warn("[Agente] Erro ao enviar indicador de digitacao")
  }

  try {
    const memoria = await obterMemoria(chatId)
    const systemPrompt = await gerarSystemPrompt(contextoLead)
    const mensagens: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...memoria,
      { role: "user", content: textoBuffer },
    ]

    // Se o paciente pediu prova visual (gatilho), obrigamos o GPT-4o a chamar
    // `listar_midias` na primeira iteracao. Sem isso, o modelo alucina
    // "enviei uma imagem" em texto, sem executar a tool.
    const forcarMidia = detectarGatilhoMidia(textoBuffer)

    let resposta = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: mensagens,
      tools: ferramentasAgente,
      tool_choice: forcarMidia
        ? { type: "function", function: { name: "listar_midias" } }
        : "auto",
    })

    let iteracoes = 0
    // Por padrao deixamos o GPT escolher, mas se acabou de listar midias com
    // resultado nao vazio, a proxima iteracao EXIGE enviar_midia — impede a
    // alucinacao "acabei de enviar uma foto" sem chamar a tool.
    let proximoToolChoice: "auto" | { type: "function"; function: { name: string } } = "auto"

    while (
      resposta.choices[0]?.message?.tool_calls &&
      resposta.choices[0].message.tool_calls.length > 0 &&
      iteracoes < MAX_TOOL_ITERATIONS
    ) {
      const toolCalls = resposta.choices[0].message.tool_calls

      mensagens.push(resposta.choices[0].message)

      let forcarEnviarMidiaNext = false

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue
        const fn = toolCall.function
        const args = JSON.parse(fn.arguments || "{}")

        // GPT-4o as vezes passa leadId/conversaId vazios ou errados (foi a
        // causa do "acabei de enviar a foto" sem envio real). Injetamos os
        // valores reais do contexto do webhook para toda tool que os aceita.
        const toolsComIds = new Set([
          "registrar_mensagem",
          "registrar_agendamento",
          "listar_midias",
          "enviar_midia",
        ])
        if (toolsComIds.has(fn.name)) {
          if (leadId) args.leadId = leadId
          if (conversaId) args.conversaId = conversaId
        }

        const resultado = await executarFerramenta(fn.name, args, baseUrl)

        if (fn.name === "listar_midias") {
          try {
            const parsed = JSON.parse(resultado)
            if (Array.isArray(parsed?.midias) && parsed.midias.length > 0) {
              forcarEnviarMidiaNext = true
            }
          } catch {
            // resposta invalida — deixa o GPT decidir
          }
        }

        mensagens.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultado,
        })
      }

      proximoToolChoice = forcarEnviarMidiaNext
        ? { type: "function", function: { name: "enviar_midia" } }
        : "auto"

      resposta = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: mensagens,
        tools: ferramentasAgente,
        tool_choice: proximoToolChoice,
      })

      iteracoes++
    }

    const textoResposta = resposta.choices[0]?.message?.content || ""
    if (!textoResposta) {
      console.warn("[Agente] GPT-4o retornou resposta vazia")
      return
    }

    const segmentos = segmentarResposta(textoResposta)

    for (let i = 0; i < segmentos.length; i++) {
      const segmento = segmentos[i]

      try {
        await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, true)
      } catch {
        console.warn("[Agente] Erro ao enviar digitando antes do segmento")
      }

      const typingDelay = Math.min(segmento.length * 30, 3000)
      await new Promise((resolve) => setTimeout(resolve, typingDelay))

      await enviarMensagem(
        configWa.uazapiUrl,
        configWa.instanceToken,
        whatsapp,
        segmento
      )

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

      if (i < segmentos.length - 1) {
        const delay = Math.floor(Math.random() * 2001) + 2000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    await adicionarAMemoria(chatId, { role: "user", content: textoBuffer })
    await adicionarAMemoria(chatId, { role: "assistant", content: textoResposta })

    // JLAU-571 Fase 1 — Analista IA em shadow mode.
    // Aguardar para garantir execucao em serverless (fire-and-forget seria morto
    // ao retornar da rota). A mensagem ao paciente ja foi enviada via UAZAPI;
    // este await so atrasa a resposta HTTP para o UAZAPI, que nao e sensivel a latencia.
    if (leadId) {
      try {
        await analisarConversa({ leadId, conversaId })
      } catch (err) {
        console.error("[Analista] Falha:", err)
      }
    }
  } catch (error) {
    console.error("[Agente] Erro no loop de resposta:", error)
  } finally {
    try {
      await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, false)
    } catch {
      console.warn("[Agente] Erro ao parar indicador de digitacao")
    }
  }
}
