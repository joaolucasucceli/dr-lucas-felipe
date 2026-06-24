import { openai } from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase"
import { getBaseUrl } from "@/lib/env"
import { obterELimparBuffer } from "@/lib/agente/buffer"
import { obterMemoria, adicionarAMemoria } from "@/lib/agente/memoria"
import { temNomeAutodeclarado } from "@/lib/agente/atualizar-lead"
import { gerarSystemPrompt, type ContextoContato } from "@/lib/agente/prompt"
import { ferramentasAgente, executarFerramenta } from "@/lib/agente/ferramentas"
import {
  detectarGatilhoProcedimentoMidia,
  detectarGatilhoVisualMidia,
} from "@/lib/agente/gatilho-midia"
import { humanizarTexto } from "@/lib/agente/humanizar-texto"
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

function normalizarTextoBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}

function ehRespostaAfirmativaCurta(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto).replace(/[.!?]+$/g, "").trim()
  if (!normalizado || normalizado.length > 80) return false

  const respostasDiretas = new Set([
    "sim",
    "pode",
    "pode sim",
    "claro",
    "claro que sim",
    "vamos",
    "bora",
    "ok",
    "okay",
    "ta bom",
    "tudo bem",
    "beleza",
    "combinado",
  ])

  return respostasDiretas.has(normalizado)
}

function assistentePediuPerguntasQualificacao(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  return (
    normalizado.includes("posso te fazer algumas perguntas") ||
    (normalizado.includes("perguntas rapidas") &&
      (normalizado.includes("orcamento") || normalizado.includes("orcamento certinho")))
  )
}

function consentiuComQualificacao(
  textoPaciente: string,
  memoria: Awaited<ReturnType<typeof obterMemoria>>
): boolean {
  if (!ehRespostaAfirmativaCurta(textoPaciente)) return false

  const ultimaMensagemAssistente = [...memoria]
    .reverse()
    .find((mensagem) => mensagem.role === "assistant")?.content

  return ultimaMensagemAssistente
    ? assistentePediuPerguntasQualificacao(ultimaMensagemAssistente)
    : false
}

function montarPerguntaQualificacaoFallback(contexto: ContextoContato): string {
  const primeiroNome = contexto.nome?.trim().split(/\s+/)[0]
  const vocativo = primeiroNome ? `, ${primeiroNome}` : ""
  return `Perfeito${vocativo}. Pra eu montar seu orçamento certinho, qual é seu principal incômodo nessa região: gordura localizada, flacidez ou contorno?`
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
      `[Agente] Mais de uma config_whatsapp ativa (${data.length}). Usando a mais recente. Recomendado: desativar as antigas no painel.`
    )
  }
  return data[0]
}

/**
 * Resultado do processamento (contatoId + conversaId). A Ana Júlia já mantém
 * cadastro e funil sozinha via a tool `atualizar_lead` durante o loop, então
 * não há mais pós-processamento em background. Mantido por compatibilidade do
 * route handler `/api/agente/processar`.
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
      const nomeAtual = resultadoPaciente.contato.nome ?? ""
      const nomePerfilWhatsappNaoConfirmado =
        resultadoPaciente.contato.origem === "whatsapp" &&
        resultadoPaciente.contato.tipo === "lead" &&
        !temNomeAutodeclarado(resultadoPaciente.sobreOPaciente, nomeAtual)
      const nomePaciente =
        nomeAtual && !nomeAtual.startsWith("WhatsApp ") && !nomePerfilWhatsappNaoConfirmado
          ? nomeAtual
          : undefined
      contextoContato = {
        nome: nomePaciente,
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
    const { data: contatoResponsavel } = await supabaseAdmin
      .from("contatos")
      .select("responsavelId")
      .eq("id", contatoId)
      .maybeSingle()

    if (contatoResponsavel?.responsavelId) {
      console.log(`[Agente] Atendimento humano ativo no contato ${contatoId} - automacao pausada`)
      return null
    }

    // Handoff humano ativo: IA pausa ate o Dr. Lucas assumir o chat.
    // O flag `aguardandoOrcamentoHumano` no contato sinaliza o transbordo;
    // o detector de retomada no webhook zera quando ele responde fromMe=true.
    const { data: contatoHandoff } = await supabaseAdmin
      .from("contatos")
      .select("aguardandoOrcamentoHumano")
      .eq("id", contatoId)
      .maybeSingle()

    if ((contatoHandoff as { aguardandoOrcamentoHumano?: boolean })?.aguardandoOrcamentoHumano) {
      console.log(`[Agente] Contato ${contatoId} aguardando orcamento manual do Dr. Lucas — IA pausada`)
      return null
    }
  }

  if (conversaId) {
    const { data: conversa } = await supabaseAdmin
      .from("conversas")
      .select("modoConversa, iaResponde")
      .eq("id", conversaId)
      .maybeSingle()

    if (conversa?.modoConversa === "humano") {
      console.error(`[Agente] Conversa ${conversaId} em modo humano — IA não responde`)
      return null
    }

    // Quando iaResponde=false, a automacao deve permanecer pausada ate
    // reabertura explicita pelo fluxo operacional.
    if ((conversa as { iaResponde?: boolean })?.iaResponde === false) {
      console.log(`[Agente] Conversa ${conversaId} com iaResponde=false — IA nao responde`)
      return null
    }
  }

  try {
    await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, true)
  } catch {
    console.warn("[Agente] Erro ao enviar indicador de digitacao")
  }

  // Busca agendamento futuro ativo para permitir remarcacao/cancelamento
  // sem depender de historico antigo da conversa.
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
    const pacienteAceitouQualificacao = consentiuComQualificacao(textoBuffer, memoria)
    const mensagens: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...memoria,
      ...(pacienteAceitouQualificacao
        ? [
            {
              role: "system" as const,
              content:
                "O paciente acabou de aceitar responder perguntas de qualificacao para orcamento. Nesta rodada, NAO chame buscar_conteudo nem enviar_midia. Inicie a qualificacao com a proxima pergunta concreta, uma pergunta por vez.",
            },
          ]
        : []),
      { role: "user", content: textoBuffer },
    ]

    // Heurística determinística: conteúdo/mídia só é forçado depois que o
    // acolhimento já tem nome, evitando pular apresentação/pergunta inicial.
    const gatilhoVisual = detectarGatilhoVisualMidia(textoBuffer)
    const gatilhoProcedimento = detectarGatilhoProcedimentoMidia(textoBuffer)
    const temNomeAcolhido = Boolean(contextoContato.nome)
    const contextoProntoParaMidia = Boolean(
      temNomeAcolhido && contextoContato.procedimento
    )
    const forcarBuscaConteudo =
      !pacienteAceitouQualificacao &&
      temNomeAcolhido &&
      (gatilhoVisual ||
        (gatilhoProcedimento && contextoProntoParaMidia) ||
        (contextoProntoParaMidia && contextoContato.etapa === "qualificacao"))
    const forcarEnvioMidia =
      temNomeAcolhido && (gatilhoVisual || (gatilhoProcedimento && contextoProntoParaMidia))

    const ferramentasDaRodada = pacienteAceitouQualificacao
      ? ferramentasAgente.filter(
          (tool) =>
            tool.type !== "function" ||
            tool.function.name !== "buscar_conteudo" &&
            tool.function.name !== "enviar_midia"
        )
      : ferramentasAgente

    let resposta = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: mensagens,
      tools: ferramentasDaRodada,
      tool_choice: forcarBuscaConteudo
        ? { type: "function", function: { name: "buscar_conteudo" } }
        : "auto",
    })

    let iteracoes = 0
    // Por padrao deixamos o GPT escolher, mas se acabou de listar midias com
    // resultado nao vazio, a proxima iteracao EXIGE enviar_midia — impede a
    // alucinacao "acabei de enviar uma foto" sem chamar a tool.
    let proximoToolChoice: "auto" | { type: "function"; function: { name: string } } = "auto"
    let enviouMidiaNestaRodada = false

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
          "atualizar_lead",
          "buscar_conteudo",
          "enviar_midia",
          "gerar_orcamento",
        ])
        if (toolsComIds.has(fn.name)) {
          if (contatoId) args.contatoId = contatoId
          if (conversaId) args.conversaId = conversaId
        }

        const resultado = await executarFerramenta(fn.name, args, baseUrl)
        let enviouMidiaAgora = false

        // Lógica anti-alucinação: se busca retornou mídia nova e o momento
        // permite, próxima iteração EXIGE enviar_midia.
        if (fn.name === "buscar_conteudo" && forcarBuscaConteudo && forcarEnvioMidia) {
          try {
            const parsed = JSON.parse(resultado)
            const midias = Array.isArray(parsed?.midias) ? parsed.midias : []
            const jaEnviouAlguma = midias.some(
              (midia: { jaEnviada?: boolean }) => midia.jaEnviada
            )
            const temMidiaNova = midias.some(
              (midia: { jaEnviada?: boolean }) => !midia.jaEnviada
            )
            if (temMidiaNova && !jaEnviouAlguma) {
              forcarEnviarMidiaNext = true
            }
          } catch {
            // resposta invalida — deixa o GPT decidir
          }
        }

        if (fn.name === "enviar_midia") {
          try {
            const parsed = JSON.parse(resultado)
            enviouMidiaAgora = parsed?.ok === true && parsed?.enviado === true
            enviouMidiaNestaRodada = enviouMidiaNestaRodada || enviouMidiaAgora
          } catch {
            // resposta invalida - segue fluxo normal
          }
        }

        mensagens.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultado,
        })

        if (enviouMidiaAgora) {
          mensagens.push({
            role: "system",
            content:
              "A midia foi enviada com sucesso. Agora responda em texto e avance a conversa: se ainda esta qualificando, faca a proxima pergunta de qualificacao. Nao encerre a rodada apenas com a midia.",
          })
        }
      }

      proximoToolChoice = forcarEnviarMidiaNext
        ? { type: "function", function: { name: "enviar_midia" } }
        : "auto"

      resposta = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: mensagens,
        tools: ferramentasDaRodada,
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

    if (!textoResposta && enviouMidiaNestaRodada) {
      textoResposta = montarPerguntaQualificacaoFallback(contextoContato)
      console.warn("[Agente] Midia enviada sem texto final - aplicando fallback de qualificacao")
    }

    if (!textoResposta) {
      // Ultimo recurso — frase neutra que pede o paciente reformular sem
      // expor erro tecnico (regra absoluta #11 do system prompt).
      textoResposta = "Deu uma travadinha aqui, pode mandar de novo?"
      console.warn("[Agente] Resposta vazia mesmo apos fallback — enviando frase neutra")
    }

    textoResposta = humanizarTexto(textoResposta)

    const segmentos = segmentarResposta(textoResposta)

    for (let i = 0; i < segmentos.length; i++) {
      const segmento = segmentos[i]

      try {
        await enviarDigitando(configWa.uazapiUrl, configWa.instanceToken, chatId, true)
      } catch {
        console.warn("[Agente] Erro ao enviar digitando antes do segmento")
      }

      const typingDelay = Math.min(segmento.length * 12, 1200)
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
        const delay = Math.floor(Math.random() * 601) + 600
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

  // Retorna IDs pro route handler `/api/agente/processar`.
  if (!contatoId) return null
  return { contatoId, conversaId }
}
