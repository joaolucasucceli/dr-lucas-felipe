import { openai } from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase"
import { getBaseUrl } from "@/lib/env"
import { obterELimparBuffer } from "@/lib/agente/buffer"
import { obterMemoria, adicionarAMemoria } from "@/lib/agente/memoria"
import { gerarSystemPrompt, type ContextoContato } from "@/lib/agente/prompt"
import { ferramentasAgente, executarFerramenta } from "@/lib/agente/ferramentas"
import { detectarGatilhoMidia } from "@/lib/agente/gatilho-midia"
import { enviarMensagem, enviarDigitando } from "@/lib/uazapi"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"

const MAX_TOOL_ITERATIONS = 10

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
  // Pode haver mais de uma config ativa por bug operacional. Pegamos a mais
  // recente e logamos warn — comportamento antes era nao-deterministico
  // (PostgreSQL escolhia uma "qualquer", podia trocar entre requests).
  const { data, error } = await supabaseAdmin
    .from("config_whatsapp")
    .select("*")
    .eq("ativo", true)
    .order("atualizadoEm", { ascending: false })
    .limit(2)

  if (error) {
    console.error("[Agente] Erro ao buscar config_whatsapp:", error.message)
    return null
  }

  if (!data || data.length === 0) return null
  if (data.length > 1) {
    console.warn(
      `[Agente] Mais de uma config_whatsapp ativa (${data.length}). Usando a mais recente. Recomendado: arquivar as antigas no painel.`
    )
  }
  return data[0]
}

/**
 * Resultado do processamento — usado pelo route handler `/api/agente/processar`
 * pra disparar a Analista IA via `after()` (depois da response, sem bloquear).
 *
 * Antes desta refatoracao, a Analista era chamada DENTRO desta funcao com `await`,
 * o que adicionava 2-5s de latencia na resposta HTTP pro UAZAPI (que nao precisa
 * do resultado). Agora o handler decide quando rodar a Analista.
 */
export interface ResultadoProcessamento {
  contatoId: string
  conversaId: string | null
}

export async function processarMensagens(
  chatId: string
): Promise<ResultadoProcessamento | null> {
  const buffer = await obterELimparBuffer(chatId)
  if (buffer.length === 0) return null

  const textoBuffer = buffer.map((m) => m.conteudo).join("\n")
  const whatsapp = extrairNumero(chatId)

  const configWa = await obterConfigWhatsapp()
  if (!configWa?.instanceToken || !configWa?.uazapiUrl) {
    console.warn("[Agente] ConfigWhatsapp não encontrada ou incompleta — não será possível responder")
    return null
  }

  const baseUrl = getBaseUrl()

  let contextoContato: ContextoContato = {}
  let contatoId: string | null = null
  let conversaId: string | null = null

  try {
    const resultadoPaciente = JSON.parse(
      await executarFerramenta("consultar_paciente", { whatsapp }, baseUrl)
    )
    if (resultadoPaciente.contato) {
      // Antes existia logica de STATUSES_SILENCIO/STATUSES_RETORNO aqui, mas
      // ambos arrays estavam vazios desde a refatoracao do funil pra 4 etapas
      // (JLAU-...). Removido o codigo morto. Se quiser reativar "novo ciclo
      // pra paciente de retorno", `abrirNovoCiclo` continua disponivel em
      // `lib/agente/kanban-sync.ts` — basta plugar aqui novamente.
      const nomeConfirmado = resultadoPaciente.sobreOPaciente
        ? resultadoPaciente.contato.nome
        : undefined
      contextoContato = {
        nome: nomeConfirmado,
        procedimento: resultadoPaciente.contato.procedimentoInteresse,
        etapa: resultadoPaciente.contato.statusFunil,
        sobreOPaciente: resultadoPaciente.sobreOPaciente,
        ehRetorno: resultadoPaciente.contato.ehRetorno,
        cicloAtual: resultadoPaciente.contato.cicloAtual,
        ciclosCompletos: resultadoPaciente.contato.ciclosCompletos,
        ultimoProcedimento: resultadoPaciente.ultimoProcedimento,
      }
      contatoId = resultadoPaciente.contato.id
      conversaId = resultadoPaciente.conversa?.id || null
    }
  } catch (error) {
    console.error("[Agente] Erro ao consultar paciente:", error)
  }

  if (contatoId) {
    const { data: usuarioIa } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("tipo", "ia")
      .eq("ativo", true)
      .is("deletadoEm", null)
      .maybeSingle()

    if (usuarioIa) {
      const { data: contatoAtual } = await supabaseAdmin
        .from("contatos")
        .select("responsavelId")
        .eq("id", contatoId)
        .maybeSingle()

      if (contatoAtual?.responsavelId && contatoAtual.responsavelId !== usuarioIa.id) {
        console.log(`[Agente] IA não é responsável pelo contato ${contatoId } — não responde`)
        return null
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
      return null
    }
  }

  try {
    await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, true)
  } catch {
    console.warn("[Agente] Erro ao enviar indicador de digitacao")
  }

  // Busca agendamento futuro pendente de confirmacao pra IA reconhecer
  // resposta de lembrete e chamar confirmar_agendamento.
  if (contatoId && contextoContato) {
    try {
      const { data: ag } = await supabaseAdmin
        .from("agendamentos")
        .select("id, dataHora, status")
        .eq("contatoId", contatoId)
        .in("status", ["agendado", "remarcado"] as never)
        .gt("dataHora", new Date().toISOString())
        .order("dataHora", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (ag) {
        const data = new Date(ag.dataHora)
        const label = new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          weekday: "short",
          day: "2-digit",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }).format(data)
        contextoContato.agendamentoPendente = {
          id: ag.id,
          dataHoraIso: ag.dataHora,
          label,
        }
      }
    } catch (err) {
      console.warn("[Agente] Erro ao buscar agendamento pendente:", err)
    }
  }

  try {
    const memoria = await obterMemoria(chatId)
    const systemPrompt = await gerarSystemPrompt(contextoContato)
    const mensagens: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...memoria,
      { role: "user", content: textoBuffer },
    ]

    // Se o paciente pediu prova visual (gatilho), obrigamos o GPT-4o a chamar
    // `buscar_conteudo` na primeira iteracao. Sem isso, o modelo alucina
    // "enviei uma imagem" em texto, sem executar a tool.
    const forcarMidia = detectarGatilhoMidia(textoBuffer)

    let resposta = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: mensagens,
      tools: ferramentasAgente,
      tool_choice: forcarMidia
        ? { type: "function", function: { name: "buscar_conteudo" } }
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
        let args: Record<string, unknown>
        try {
          args = JSON.parse(fn.arguments || "{}")
        } catch (err) {
          console.error(
            `[Agente] GPT enviou JSON invalido em ${fn.name}:`,
            fn.arguments,
            err
          )
          mensagens.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              ok: false,
              error: "Argumentos invalidos (JSON malformado)",
            }),
          })
          continue
        }

        // GPT-4o as vezes passa contatoId/conversaId vazios ou errados (foi a
        // causa do "acabei de enviar a foto" sem envio real). Injetamos os
        // valores reais do contexto do webhook para toda tool que os aceita.
        const toolsComIds = new Set([
          "registrar_mensagem",
          "registrar_agendamento",
          "buscar_conteudo",
          "enviar_midia",
        ])
        if (toolsComIds.has(fn.name)) {
          if (contatoId) args.contatoId = contatoId
          if (conversaId) args.conversaId = conversaId
        }

        const resultado = await executarFerramenta(fn.name, args, baseUrl)

        // Lógica anti-alucinação: se busca retornou midias E o paciente
        // pediu prova visual (gatilho), próxima iteração EXIGE enviar_midia.
        if (fn.name === "buscar_conteudo" && forcarMidia) {
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

    let textoResposta = resposta.choices[0]?.message?.content || ""

    // Se atingiu MAX_TOOL_ITERATIONS sem texto final, forca uma chamada SEM
    // tools pra obrigar GPT-4o a fechar com prosa. Antes desse fallback, o
    // paciente recebia silencio (return sem enviar nada) — pior UX possivel.
    const aindaPedindoTool = !!resposta.choices[0]?.message?.tool_calls?.length
    if ((!textoResposta || aindaPedindoTool) && iteracoes >= MAX_TOOL_ITERATIONS) {
      console.warn(
        `[Agente] Atingiu MAX_TOOL_ITERATIONS (${iteracoes}) sem fechar resposta — forcando fallback sem tools`
      )
      try {
        const fallback = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: mensagens,
          tool_choice: "none",
        })
        textoResposta = fallback.choices[0]?.message?.content || ""
      } catch (err) {
        console.error("[Agente] Fallback sem tools tambem falhou:", err)
      }
    }

    if (!textoResposta) {
      // Ultimo recurso — frase neutra que pede o paciente reformular sem
      // expor erro tecnico (regra absoluta #11 do system prompt).
      textoResposta = "Deu uma travadinha aqui, pode mandar de novo?"
      console.warn("[Agente] Resposta vazia mesmo apos fallback — enviando frase neutra")
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

      if (contatoId) {
        try {
          await executarFerramenta(
            "registrar_mensagem",
            {
              conversaId,
              contatoId,
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
  } catch (error) {
    console.error("[Agente] Erro no loop de resposta:", error)
  } finally {
    try {
      await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, false)
    } catch {
      console.warn("[Agente] Erro ao parar indicador de digitacao")
    }
  }

  // Retorna IDs pro route handler `/api/agente/processar` disparar a Analista
  // via `after()` apos a response — antes a Analista era await aqui, atrasando
  // 2-5s desnecessariamente o HTTP response pro UAZAPI.
  if (!contatoId) return null
  return { contatoId, conversaId }
}
