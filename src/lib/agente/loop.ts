import { openai } from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase"
import { getBaseUrl } from "@/lib/env"
import { obterELimparBuffer } from "@/lib/agente/buffer"
import {
  obterMemoria,
  adicionarAMemoria,
  limparMemoria,
} from "@/lib/agente/memoria"
import { temNomeAutodeclarado } from "@/lib/agente/atualizar-lead"
import { gerarSystemPrompt, type ContextoContato } from "@/lib/agente/prompt"
import { ferramentasAgente, executarFerramenta } from "@/lib/agente/ferramentas"
import { enviarResultadosProcedimento } from "@/lib/agente/enviar-resultados-procedimento"
import {
  detectarGatilhoProcedimentoMidia,
  detectarGatilhoVisualMidia,
} from "@/lib/agente/gatilho-midia"
import { humanizarTexto } from "@/lib/agente/humanizar-texto"
import {
  FATO_FOTO_QUALIFICACAO,
  assistentePediuDadoQualificacao,
  etapaPerguntadaPeloAssistente,
  normalizarTextoBusca,
  proximaEtapaPendente,
  qualificacaoTemDadosMinimos,
} from "@/lib/agente/fluxo-qualificacao"
import { enviarMensagem, enviarDigitando } from "@/lib/uazapi"
import { criarId, agora } from "@/lib/db-utils"
import { redis } from "@/lib/redis"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"

const MAX_TOOL_ITERATIONS = 4
const PROCESSAMENTO_DEADLINE_MS = 45_000
const OPENAI_TIMEOUT_MAX_MS = 18_000
const DEADLINE_MARGIN_MS = 5_000
const AGENDAMENTO_ESTADO_TTL = 60 * 60 * 3

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

function ehRespostaAfirmativaCurta(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
    .replace(/[.!?]+$/g, "")
    .trim()
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
    "obg",
    "obrigado",
    "obrigada",
    "ok obg",
    "ok obrigado",
    "ok obrigada",
    "valeu",
    "show",
    "show de bola",
  ])

  return respostasDiretas.has(normalizado)
}

function ehPedidoStatusOrcamentoPendente(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  return (
    /\b(quanto|valor|preco|orcamento|orçamento)\b/.test(normalizado) &&
      /\b(ficou|fica|saiu|voltou|deu|custa|custaria|vai ficar|ja|já)\b/.test(
        normalizado
      )
  )
}

function ehPedidoAgendamentoDuranteOrcamentoPendente(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  return /\b(agendar|agenda|marcar|reuniao|reunião|horario|horário)\b/.test(
    normalizado
  )
}

function montarRespostaStatusOrcamentoPendente(
  contexto: ContextoContato
): string {
  return comVocativo(
    contexto,
    "Ainda estou aguardando o Dr. Lucas definir o valor certinho{nome}. Assim que ele responder, eu te aviso por aqui."
  )
}

function montarRespostaAgendamentoDuranteOrcamentoPendente(
  contexto: ContextoContato
): string {
  return comVocativo(
    contexto,
    "Combinado{nome}. A reunião online pode ser o próximo passo, mas primeiro vou te devolver o orçamento exato do Dr. Lucas. Assim que ele responder e fizer sentido pra você, eu vejo os horários disponíveis."
  )
}

/**
 * Rede de segurança: o script não pede mais permissão para qualificar, mas se
 * a OpenAI emitir uma frase desse tipo por conta própria, o "pode sim" do
 * paciente ainda precisa cair na próxima etapa em vez de voltar pro modelo.
 */
function assistentePediuPerguntasQualificacao(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  return (
    normalizado.includes("posso te fazer algumas perguntas") ||
    (normalizado.includes("perguntas rapidas") &&
      (normalizado.includes("orcamento") ||
        normalizado.includes("orcamento certinho")))
  )
}

function ultimaMensagemAssistente(
  memoria: Awaited<ReturnType<typeof obterMemoria>>
): string | null {
  return (
    [...memoria].reverse().find((mensagem) => mensagem.role === "assistant")
      ?.content ?? null
  )
}

function saudacaoAtual(): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const hora = Number(partes.find((parte) => parte.type === "hour")?.value)

  if (hora >= 5 && hora < 12) return "bom dia"
  if (hora >= 12 && hora < 18) return "boa tarde"
  return "boa noite"
}

function detectarServicoAbertura(texto: string): {
  tipo: "mini_lipo" | "generico"
  regiao?: string
} | null {
  const normalizado = normalizarTextoBusca(texto)
  const regioes = [
    { termo: "abdomen", label: "abdômen" },
    { termo: "abdome", label: "abdômen" },
    { termo: "barriga", label: "abdômen" },
    { termo: "flanco", label: "flancos" },
    { termo: "papada", label: "papada" },
    { termo: "culote", label: "culote" },
    { termo: "costas", label: "costas" },
    { termo: "axila", label: "axilas" },
    { termo: "braco", label: "braços" },
  ]
  const regiao = regioes.find((item) => normalizado.includes(item.termo))?.label

  if (
    normalizado.includes("mini lipo") ||
    normalizado.includes("minilipo") ||
    normalizado.includes("lipo") ||
    regiao
  ) {
    return { tipo: "mini_lipo", regiao }
  }

  if (
    normalizado.includes("procedimento") ||
    normalizado.includes("estetico") ||
    normalizado.includes("estetica") ||
    normalizado.includes("anuncio") ||
    normalizado.includes("como funciona") ||
    normalizado.includes("quero saber")
  ) {
    return { tipo: "generico" }
  }

  return null
}

function montarIntencaoInicialLead(texto: string): {
  procedimentoInteresse: string | null
  fato: string | null
} {
  const servico = detectarServicoAbertura(texto)
  if (!servico) return { procedimentoInteresse: null, fato: null }

  if (servico.tipo === "mini_lipo") {
    const procedimentoInteresse = servico.regiao
      ? `mini lipo ${servico.regiao}`
      : "mini lipo"
    const alvo = servico.regiao
      ? `mini lipo em ${servico.regiao}`
      : "mini lipo"

    return {
      procedimentoInteresse,
      fato: `Intenção inicial do lead: demonstrou interesse em ${alvo} e quer entender como funciona.`,
    }
  }

  return {
    procedimentoInteresse: null,
    fato: "Intenção inicial do lead: quer entender melhor o atendimento e os procedimentos do Dr. Lucas.",
  }
}

function montarAberturaObrigatoria(textoPaciente: string): string {
  const servico = detectarServicoAbertura(textoPaciente)
  const saudacao = `Olá, ${saudacaoAtual()}! Meu nome é Ana Júlia, sou do time de pré-atendimento do Dr. Lucas Ferreira.`

  if (servico?.tipo === "mini_lipo") {
    const conexao = servico.regiao
      ? `Pelo que você comentou, você quer entender se a mini lipo faz sentido para tratar ${servico.regiao}.`
      : "Pelo que você comentou, você quer entender se a mini lipo faz sentido para o seu caso."

    return [
      saudacao,
      `A mini lipo é uma técnica menos invasiva de lipoaspiração, focada em áreas específicas para refinar o contorno corporal. ${conexao}`,
      "Antes da gente aprofundar, como posso te chamar?",
    ].join("\n---\n")
  }

  return [
    saudacao,
    "Vou entender melhor o que você está buscando para te orientar do jeito certo.",
    "Antes da gente aprofundar, como posso te chamar?",
  ].join("\n---\n")
}

function temIntencaoInicialRegistrada(sobreOPaciente?: string | null): boolean {
  return normalizarTextoBusca(sobreOPaciente || "").includes("intencao inicial do lead")
}

function deveUsarFastPathPosNome(
  textoPaciente: string,
  contexto: ContextoContato,
  memoria: Awaited<ReturnType<typeof obterMemoria>>
): boolean {
  if (!["acolhimento", "qualificacao"].includes(contexto.etapa ?? "")) {
    return false
  }
  if (!extrairNomeAutodeclarado(textoPaciente)) return false

  const ultimaMensagem = ultimaMensagemAssistente(memoria)
  if (!ultimaMensagem) return false
  if (!normalizarTextoBusca(ultimaMensagem).includes("como posso te chamar")) {
    return false
  }

  return Boolean(contexto.procedimento)
}

/**
 * Resposta imediatamente após o paciente se apresentar.
 *
 * Antes de 22/07/2026 esta função oferecia a bifurcação "estimativa OU
 * perguntas rápidas", que abria um ramo de 5 perguntas antes da foto. Agora
 * ela entra direto na primeira etapa pendente de ETAPAS_QUALIFICACAO — que é
 * região (ou já a foto, quando o lead chegou com a região no anúncio).
 */
function montarRespostaPosNome(contexto: ContextoContato): string {
  const etapa = proximaEtapaPendente(contexto)
  if (!etapa) return montarRespostaFotoQualificacaoCompleta(contexto)

  const frase = etapa.continuacao.charAt(0).toUpperCase() + etapa.continuacao.slice(1)
  return `${comVocativo(contexto, "Perfeito{nome}!")}\n---\n${frase}`
}

async function persistirIntencaoInicialLead(params: {
  contatoId: string | null
  conversaId: string | null
  textoPaciente: string
  contextoContato: ContextoContato
  baseUrl: string
}) {
  const { contatoId, conversaId, textoPaciente, contextoContato, baseUrl } = params
  if (!contatoId) return

  const intencao = montarIntencaoInicialLead(textoPaciente)
  if (!intencao.procedimentoInteresse && !intencao.fato) return

  const procedimentoInteresseInicial = intencao.procedimentoInteresse
  const devePersistirProcedimento = Boolean(
    procedimentoInteresseInicial &&
    devePersistirProcedimentoInteresse(
      contextoContato.procedimento,
      procedimentoInteresseInicial
    )
  )
  const devePersistirFato =
    intencao.fato && !temIntencaoInicialRegistrada(contextoContato.sobreOPaciente)

  if (!devePersistirProcedimento && !devePersistirFato) return

  try {
    const resultado = await executarFerramenta(
      "atualizar_lead",
      {
        contatoId,
        conversaId,
        ...(devePersistirProcedimento
          ? { procedimentoInteresse: procedimentoInteresseInicial }
          : {}),
        ...(devePersistirFato
          ? { sobreOPacienteAdicionar: intencao.fato }
          : {}),
        etapaCorreta: "manter",
      },
      baseUrl
    )
    const parsed = JSON.parse(resultado)
    if (parsed?.ok === true) {
      if (devePersistirProcedimento && procedimentoInteresseInicial) {
        contextoContato.procedimento = procedimentoInteresseInicial
      }
      if (devePersistirFato && intencao.fato) {
        contextoContato.sobreOPaciente = anexarFatoContexto(
          contextoContato.sobreOPaciente,
          intencao.fato
        )
      }
    }
  } catch (err) {
    console.error("[Agente] Erro ao persistir intenção inicial:", err)
  }
}

function deveUsarFastPathAbertura(
  contexto: ContextoContato,
  memoria: Awaited<ReturnType<typeof obterMemoria>>,
  primeiraRespostaDaConversa = false
): boolean {
  return (
    ["acolhimento", "qualificacao"].includes(contexto.etapa ?? "") &&
    (primeiraRespostaDaConversa || !ultimaMensagemAssistente(memoria))
  )
}

function consentiuComQualificacao(
  textoPaciente: string,
  memoria: Awaited<ReturnType<typeof obterMemoria>>
): boolean {
  if (!ehRespostaAfirmativaCurta(textoPaciente)) return false

  const ultimaMensagem = ultimaMensagemAssistente(memoria)

  return ultimaMensagem
    ? assistentePediuPerguntasQualificacao(ultimaMensagem)
    : false
}

function respondeuPerguntaQualificacao(
  textoPaciente: string,
  memoria: Awaited<ReturnType<typeof obterMemoria>>,
  etapa?: string | null
): boolean {
  if (etapa !== "qualificacao") return false
  if (detectarGatilhoVisualMidia(textoPaciente)) return false

  const ultimaMensagem = ultimaMensagemAssistente(memoria)
  return ultimaMensagem
    ? assistentePediuDadoQualificacao(ultimaMensagem)
    : false
}

function montarPerguntaQualificacaoFallback(contexto: ContextoContato): string {
  return montarProximaPerguntaQualificacao(contexto)
}

function primeiroNome(contexto: ContextoContato): string | null {
  return contexto.nome?.trim().split(/\s+/)[0] || null
}

function comVocativo(contexto: ContextoContato, texto: string): string {
  const nome = primeiroNome(contexto)
  return nome
    ? texto.replace("{nome}", `, ${nome}`)
    : texto.replace("{nome}", "")
}

function pacienteFezPerguntaOuMudouAssunto(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  if (texto.includes("?")) return true
  return [
    "quanto custa",
    "qual valor",
    "preco",
    "preço",
    "agenda",
    "agendar",
    "horario",
    "horário",
    "humano",
    "atendente",
    "dr lucas",
  ].some((termo) => normalizado.includes(normalizarTextoBusca(termo)))
}

/**
 * Próxima pergunta do fluxo, derivada de `ETAPAS_QUALIFICACAO`. Quando não há
 * etapa pendente, o caso está pronto para ir ao Dr. Lucas.
 */
function montarProximaPerguntaQualificacao(contexto: ContextoContato): string {
  const etapa = proximaEtapaPendente(contexto)
  if (!etapa) return montarRespostaFotoQualificacaoCompleta(contexto)
  return comVocativo(contexto, etapa.pergunta)
}

function montarRespostaFotoQualificacaoCompleta(
  contexto: ContextoContato
): string {
  return comVocativo(
    contexto,
    [
      "Recebi{nome}. Obrigada por enviar.",
      "Agora tenho os dados principais para deixar seu caso bem claro pro Dr. Lucas. Vou enviar pra ele definir o orçamento exato e te retorno por aqui.",
      "Enquanto ele avalia, vou te mandar alguns resultados pra você ter uma referência.",
    ].join("\n---\n")
  )
}

function montarRespostaFotoQualificacaoIncompleta(
  contexto: ContextoContato
): string {
  const etapa = proximaEtapaPendente(contexto)
  if (!etapa) return montarRespostaFotoQualificacaoCompleta(contexto)

  return comVocativo(
    contexto,
    [
      "Recebi{nome}. Obrigada por enviar.",
      `Pra eu completar seu caso antes de mandar pro Dr. Lucas, ${etapa.continuacao}`,
    ].join("\n---\n")
  )
}

function montarContinuidadeQualificacao(contexto: ContextoContato): string {
  const etapa = proximaEtapaPendente(contexto)
  if (!etapa) return montarRespostaFotoQualificacaoCompleta(contexto)

  return comVocativo(
    contexto,
    `Pra eu completar seu caso com segurança, ${etapa.continuacao}`
  )
}

function contextoComFato(
  contexto: ContextoContato,
  fato: string
): ContextoContato {
  return {
    ...contexto,
    sobreOPaciente: anexarFatoContexto(contexto.sobreOPaciente, fato),
  }
}

interface FastPathQualificacao {
  tipo: string
  texto: string
  fato?: string
  acionarOrcamento?: boolean
}

function montarFastPathQualificacao(params: {
  textoPaciente: string
  contexto: ContextoContato
  memoria: Awaited<ReturnType<typeof obterMemoria>>
  pacienteAceitouQualificacao: boolean
  recebeuImagem: boolean
}): FastPathQualificacao | null {
  const {
    textoPaciente,
    contexto,
    memoria,
    pacienteAceitouQualificacao,
    recebeuImagem,
  } = params

  if (contexto.etapa !== "qualificacao") return null

  if (recebeuImagem) {
    const fato = FATO_FOTO_QUALIFICACAO
    const proximoContexto = contextoComFato(contexto, fato)
    if (qualificacaoTemDadosMinimos(proximoContexto)) {
      return {
        tipo: "foto_qualificacao_completa",
        fato,
        texto: montarRespostaFotoQualificacaoCompleta(proximoContexto),
        acionarOrcamento: true,
      }
    }

    return {
      tipo: "foto_qualificacao_incompleta",
      fato,
      texto: montarRespostaFotoQualificacaoIncompleta(proximoContexto),
    }
  }

  if (
    !pacienteAceitouQualificacao &&
    pacienteFezPerguntaOuMudouAssunto(textoPaciente)
  ) {
    return null
  }

  if (pacienteAceitouQualificacao) {
    return {
      tipo: "consentimento_qualificacao",
      texto: montarProximaPerguntaQualificacao(contexto),
    }
  }

  const ultimaMensagem = ultimaMensagemAssistente(memoria)
  if (!ultimaMensagem) return null

  // O paciente respondeu a pergunta que a Ana acabou de fazer: grava o fato da
  // etapa correspondente e emenda direto na próxima etapa pendente. Sem
  // `if` por pergunta — a etapa vem de ETAPAS_QUALIFICACAO.
  const etapaRespondida = etapaPerguntadaPeloAssistente(ultimaMensagem)
  if (!etapaRespondida || etapaRespondida.chave === "foto") return null

  const fato = etapaRespondida.montarFato(textoPaciente)
  return {
    tipo: `qualificacao_${etapaRespondida.chave}`,
    fato,
    texto: montarProximaPerguntaQualificacao(contextoComFato(contexto, fato)),
  }
}

function deadlineAproximando(inicioMs: number): boolean {
  return Date.now() - inicioMs >= PROCESSAMENTO_DEADLINE_MS - DEADLINE_MARGIN_MS
}

function timeoutOpenAI(inicioMs: number): number {
  const restante =
    PROCESSAMENTO_DEADLINE_MS - (Date.now() - inicioMs) - DEADLINE_MARGIN_MS
  return Math.max(5_000, Math.min(OPENAI_TIMEOUT_MAX_MS, restante))
}

function montarFallbackDeadline(contexto: ContextoContato): string {
  if (contexto.etapa === "qualificacao") {
    return montarContinuidadeQualificacao(contexto)
  }
  if (contexto.etapa === "orcamento") {
    return comVocativo(
      contexto,
      "Certo{nome}. Me manda um ok que eu sigo com seu orçamento por aqui."
    )
  }
  return "Deu uma travadinha aqui. Pode me mandar de novo?"
}

function assistentePediuRetryOrcamento(
  memoria: Awaited<ReturnType<typeof obterMemoria>>
): boolean {
  const ultimaMensagem = ultimaMensagemAssistente(memoria)
  if (!ultimaMensagem) return false

  const normalizado = normalizarTextoBusca(ultimaMensagem)
  return (
    normalizado.includes("me manda um ok") &&
    (normalizado.includes("orcamento") ||
      normalizado.includes("sigo com seu orcamento"))
  )
}

function assistenteJaAvisouAguardandoOrcamento(
  memoria: Awaited<ReturnType<typeof obterMemoria>>
): boolean {
  const ultimaMensagem = ultimaMensagemAssistente(memoria)
  if (!ultimaMensagem) return false

  const normalizado = normalizarTextoBusca(ultimaMensagem)
  return (
    normalizado.includes("assim que o dr lucas retornar") ||
    normalizado.includes("assim que ele responder") ||
    normalizado.includes("assim que ele retornar")
  )
}

function textoPrometeEnvioOrcamento(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  const mencionaOrcamento =
    normalizado.includes("orcamento") || normalizado.includes("valor certinho")
  const prometeuEnvio =
    normalizado.includes("mandei seus dados") ||
    normalizado.includes("enviei seus dados") ||
    normalizado.includes("vou mandar seus dados") ||
    normalizado.includes("vou enviar seus dados") ||
    normalizado.includes("vou deixar o dr lucas") ||
    normalizado.includes("vou passar pro dr lucas") ||
    normalizado.includes("vou mandar pro dr lucas") ||
    normalizado.includes("dados foram enviados") ||
    normalizado.includes("deixei o dr lucas com esses dados") ||
    normalizado.includes("ja usei essas informacoes pra gerar")

  return mencionaOrcamento && prometeuEnvio
}

interface OrcamentoRespondidoContexto {
  id: string
  respondidoEm: string | null
  observacoes: string | null
  resumoCaso: string | null
}

interface SlotAgendamentoOferecido {
  label: string
  dataIso: string
  hora: string
}

interface JanelaAgendaSolicitada {
  dataInicio: string
  dataFim: string
  labelDia: string
  ymd: string
  horario?: string | null
}

interface EstadoAgendamentoTemporario {
  // "estimativa" saiu em 22/07/2026 junto com a estimativa automatica. Estados
  // antigos com essa origem ainda podem estar no Redis (TTL 3h) e sao
  // descartados por `normalizarEstadoAgendamento` — a conversa apenas volta ao
  // fluxo normal, sem agendar em cima de um valor que a Ana nao deveria ter dado.
  origem: "orcamento" | "remarcacao"
  slots: SlotAgendamentoOferecido[]
  slotEscolhido?: SlotAgendamentoOferecido | null
  janela?: JanelaAgendaSolicitada | null
  agendamentoId?: string | null
  cancelamentoPendente?: boolean
  atualizadoEm: string
}

function limparTrechoNome(raw: string): string | null {
  const nome = raw
    .split(/[,.;!?]|\s+(?:e|mas|porque|pra|para)\s+/i)[0]
    .replace(/^(?:o|a)\s+/i, "")
    .trim()
    .replace(/\s+/g, " ")

  const palavras = nome.split(/\s+/).filter(Boolean)
  if (nome.length < 2 || nome.length > 80) return null
  if (palavras.length > 6) return null

  const normalizado = normalizarTextoBusca(nome)
  const termosInvalidos = new Set([
    "diabetico",
    "diabetica",
    "hipertenso",
    "hipertensa",
    "casado",
    "casada",
    "gestante",
    "cliente",
    "paciente",
  ])
  if (termosInvalidos.has(normalizado)) return null

  return nome
}

function extrairNomeAutodeclarado(texto: string): string | null {
  for (const linha of texto.split(/\n+/)) {
    const textoLinha = linha.trim()
    const padroes = [
      /\bmeu nome\s+(?:e|é)\s+(.+)$/i,
      /\bme chamo\s+(.+)$/i,
      /\bpode me chamar de\s+(.+)$/i,
      /^\s*sou\s+(?:o|a)?\s*(.+)$/i,
    ]

    for (const padrao of padroes) {
      const match = textoLinha.match(padrao)
      const nome = match?.[1] ? limparTrechoNome(match[1]) : null
      if (nome) return nome
    }
  }

  return null
}

function detectarInteresseQualificacao(texto: string): {
  procedimentoInteresse: string
  fato: string
} | null {
  const normalizado = normalizarTextoBusca(texto)
  const indicouIntencao =
    normalizado.includes("quero fazer") ||
    normalizado.includes("quero tratar") ||
    normalizado.includes("tenho interesse") ||
    normalizado.includes("me incomoda") ||
    normalizado.includes("gostaria de fazer") ||
    normalizado.includes("penso em fazer") ||
    normalizado.includes("mini lipo") ||
    normalizado.includes("minilipo") ||
    normalizado.includes("lipo")

  const regioes = [
    { termo: "abdomen", label: "abdômen" },
    { termo: "barriga", label: "abdômen" },
    { termo: "flanco", label: "flancos" },
    { termo: "papada", label: "papada" },
    { termo: "culote", label: "culote" },
    { termo: "costas", label: "costas" },
    { termo: "axila", label: "axilas" },
    { termo: "braco", label: "bracos" },
  ]

  const regiao = regioes.find((r) => normalizado.includes(r.termo))?.label
  if (!indicouIntencao || !regiao) return null

  const procedimentoBase =
    normalizado.includes("mini lipo") ||
    normalizado.includes("minilipo") ||
    normalizado.includes("lipo")
      ? "mini lipo"
      : "mini lipo"

  return {
    procedimentoInteresse: `${procedimentoBase} ${regiao}`,
    fato: `Paciente informou interesse em ${procedimentoBase} na região de ${regiao}.`,
  }
}

function devePersistirProcedimentoInteresse(
  atual: string | null | undefined,
  novo: string
): boolean {
  const atualNorm = normalizarTextoBusca(atual || "")
  const novoNorm = normalizarTextoBusca(novo)
  if (!atualNorm) return true
  if (atualNorm === novoNorm) return false

  const regioes = [
    "abdomen",
    "abdome",
    "flancos",
    "papada",
    "culote",
    "costas",
    "axilas",
    "bracos",
  ]
  const atualTemRegiao = regioes.some((regiao) => atualNorm.includes(regiao))
  const novoTemRegiao = regioes.some((regiao) => novoNorm.includes(regiao))
  if (!atualTemRegiao && novoTemRegiao) return true

  return novoNorm.includes(atualNorm) && novoNorm.length > atualNorm.length
}

function pacienteAprovouOrcamento(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  return [
    "aprovado",
    "faz sentido",
    "esta dentro",
    "ta dentro",
    "dentro do meu orcamento",
    "cabe no meu orcamento",
    "cabe pra mim",
    "quero marcar",
    "quero agendar",
    "quero a reuniao",
    "vamos marcar",
    "vamos agendar",
    "vamos sim",
    "sim vamos",
    "pode marcar",
    "pode agendar",
    "bora marcar",
    "bora agendar",
    "fechado",
    "pode ser",
    "deu certo",
    "marcar a reuniao",
    "agendar a reuniao",
    "seguir para agenda",
  ].some((termo) => normalizado.includes(termo))
}

function extrairValorOrcamento(observacoes: string | null): string | null {
  return observacoes?.match(/R\$\s*[\d.]+(?:,\d{2})?/i)?.[0] ?? null
}

function extrairPdfOrcamento(observacoes: string | null): string | null {
  return observacoes?.match(/https?:\/\/\S+/i)?.[0] ?? null
}

function montarRespostaAgendamentoAposOrcamento(
  contexto: ContextoContato,
  orcamento: OrcamentoRespondidoContexto
): string {
  const primeiroNome = contexto.nome?.trim().split(/\s+/)[0]
  const vocativo = primeiroNome ? `, ${primeiroNome}` : ""
  const valor = extrairValorOrcamento(orcamento.observacoes)
  const prefixo = valor
    ? `Esse orcamento de ${valor} ja foi definido pelo Dr. Lucas`
    : "Esse orcamento ja foi definido pelo Dr. Lucas"

  return `${prefixo}${vocativo}. Se fizer sentido pra voce, eu vejo os horarios mais proximos da reuniao de diagnostico online.`
}

function extrairEmailDoTexto(texto: string): string | null {
  const match = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0]?.toLowerCase() ?? null
}

function formatarHoraSlot(dataIso: string): string {
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dataIso))
  const [h, m] = hora.split(":")
  return `${Number(h)}h${m && m !== "00" ? m : ""}`
}

function extrairHorarioEscolhido(texto: string): string | null {
  const normalizado = normalizarTextoBusca(texto)
  const padroes = [
    /\b(?:as|a|para|pra|pelas|por volta das)\s+([01]?\d|2[0-3])\s*(?:(?:h|:)\s*([0-5]\d))?\s*(?:h|horas)?\b/,
    /\b([01]?\d|2[0-3])\s*h\s*([0-5]\d)?\b/,
    /\b([01]?\d|2[0-3]):([0-5]\d)\b/,
    /\b([01]?\d|2[0-3])\s+horas\b/,
  ]
  const match = padroes.map((padrao) => normalizado.match(padrao)).find(Boolean)
  if (!match) return null

  const hora = Number(match[1])
  const minuto = match[2]
  return `${hora}h${minuto && minuto !== "00" ? minuto : ""}`
}

function slotsSemIgnorados(
  slots: SlotAgendamentoOferecido[],
  slotsIgnorados: SlotAgendamentoOferecido[] = []
): SlotAgendamentoOferecido[] {
  if (slotsIgnorados.length === 0) return slots

  const dataIsoIgnorados = new Set(slotsIgnorados.map((slot) => slot.dataIso))
  return slots.filter((slot) => !dataIsoIgnorados.has(slot.dataIso))
}

function chaveEstadoAgendamento(chatId: string): string {
  return `agente:agendamento:${chatId}`
}

function normalizarSlotPersistido(
  slot: Partial<SlotAgendamentoOferecido>
): SlotAgendamentoOferecido | null {
  if (!slot.label || !slot.dataIso) return null
  return {
    label: slot.label,
    dataIso: slot.dataIso,
    hora: slot.hora || formatarHoraSlot(slot.dataIso),
  }
}

function normalizarEstadoAgendamento(
  raw: unknown
): EstadoAgendamentoTemporario | null {
  if (!raw || typeof raw !== "object") return null

  const item = raw as Partial<EstadoAgendamentoTemporario>
  if (item.origem !== "orcamento" && item.origem !== "remarcacao") {
    return null
  }

  const slots = Array.isArray(item.slots)
    ? item.slots
        .map((slot) => normalizarSlotPersistido(slot))
        .filter((slot): slot is SlotAgendamentoOferecido => Boolean(slot))
    : []
  const slotEscolhido = item.slotEscolhido
    ? normalizarSlotPersistido(item.slotEscolhido)
    : null
  const janela =
    item.janela &&
    typeof item.janela === "object" &&
    typeof item.janela.dataInicio === "string" &&
    typeof item.janela.dataFim === "string" &&
    typeof item.janela.labelDia === "string" &&
    typeof item.janela.ymd === "string"
      ? {
          dataInicio: item.janela.dataInicio,
          dataFim: item.janela.dataFim,
          labelDia: item.janela.labelDia,
          ymd: item.janela.ymd,
          horario:
            typeof item.janela.horario === "string" ? item.janela.horario : null,
        }
      : null

  return {
    origem: item.origem,
    slots,
    slotEscolhido,
    janela,
    agendamentoId:
      typeof item.agendamentoId === "string" ? item.agendamentoId : null,
    cancelamentoPendente: item.cancelamentoPendente === true,
    atualizadoEm: item.atualizadoEm || agora(),
  }
}

async function obterEstadoAgendamento(
  chatId: string
): Promise<EstadoAgendamentoTemporario | null> {
  try {
    const raw = await redis.get<unknown>(chaveEstadoAgendamento(chatId))
    if (typeof raw === "string") {
      return normalizarEstadoAgendamento(JSON.parse(raw))
    }
    return normalizarEstadoAgendamento(raw)
  } catch (err) {
    console.warn("[Agente] Falha ao ler estado temporario de agendamento:", err)
    return null
  }
}

async function salvarEstadoAgendamento(
  chatId: string,
  estado: EstadoAgendamentoTemporario
): Promise<void> {
  await redis.set(
    chaveEstadoAgendamento(chatId),
    {
      ...estado,
      atualizadoEm: agora(),
    },
    { ex: AGENDAMENTO_ESTADO_TTL }
  )
}

async function limparEstadoAgendamento(chatId: string): Promise<void> {
  try {
    await redis.del(chaveEstadoAgendamento(chatId))
  } catch (err) {
    console.warn(
      "[Agente] Falha ao limpar estado temporario de agendamento:",
      err
    )
  }
}

async function conversaTemRespostaAgente(
  conversaId: string | null
): Promise<boolean> {
  if (!conversaId) return false

  const { data, error } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .select("id")
    .eq("conversaId", conversaId)
    .eq("remetente", "agente")
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn("[Agente] Falha ao verificar primeira resposta da conversa:", {
      conversaId,
      erro: error.message,
    })
    return true
  }

  return Boolean(data)
}

function resolverSlotEscolhido(
  textoPaciente: string,
  slots: SlotAgendamentoOferecido[]
): SlotAgendamentoOferecido | null {
  if (slots.length === 0) return null

  const normalizado = normalizarTextoBusca(textoPaciente)
  if (/\b(1|primeir[ao])\b/.test(normalizado)) return slots[0] ?? null
  if (/\b(2|segund[ao])\b/.test(normalizado)) return slots[1] ?? null
  if (/\b(3|terceir[ao])\b/.test(normalizado)) return slots[2] ?? null

  const porLabel = slots.find((slot) =>
    normalizado.includes(normalizarTextoBusca(slot.label))
  )
  if (porLabel) return porLabel

  const horaEscolhida = extrairHorarioEscolhido(textoPaciente)
  if (!horaEscolhida) return null

  return slots.find((slot) => slot.hora === horaEscolhida) ?? null
}

function detectarPreferenciaPeriodo(texto: string): "manha" | "tarde" | null {
  const normalizado = normalizarTextoBusca(texto)
  if (normalizado.includes("manha")) return "manha"
  if (normalizado.includes("tarde")) return "tarde"
  return null
}

function detectarPedidoRemarcacao(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  return (
    normalizado.includes("remarcar") ||
    normalizado.includes("reagendar") ||
    normalizado.includes("mudar horario") ||
    normalizado.includes("mudar o horario") ||
    normalizado.includes("trocar horario") ||
    normalizado.includes("trocar o horario") ||
    normalizado.includes("outro horario") ||
    normalizado.includes("outro dia") ||
    normalizado.includes("nao consigo nesse horario") ||
    normalizado.includes("nao vou conseguir")
  )
}

function detectarPedidoCancelamento(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
  return (
    normalizado.includes("cancelar") ||
    normalizado.includes("cancela") ||
    normalizado.includes("desistir") ||
    normalizado.includes("desisto") ||
    normalizado.includes("nao vou mais") ||
    normalizado.includes("nao quero mais")
  )
}

function detectarNegacaoCurta(texto: string): boolean {
  const normalizado = normalizarTextoBusca(texto)
    .replace(/[.!?]+$/g, "")
    .trim()
  return ["nao", "não", "melhor nao", "melhor não", "deixa"].includes(
    normalizado
  )
}

function filtrarSlotsPorPeriodo(
  slots: SlotAgendamentoOferecido[],
  periodo: "manha" | "tarde" | null
): SlotAgendamentoOferecido[] {
  if (!periodo) return slots
  return slots.filter((slot) => {
    const hora = Number(
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hour12: false,
      }).format(new Date(slot.dataIso))
    )
    return periodo === "manha" ? hora < 12 : hora >= 12
  })
}

function formatarListaSlots(slots: SlotAgendamentoOferecido[]): string {
  if (slots.length === 1) return slots[0].label
  if (slots.length === 2) return `${slots[0].label} ou ${slots[1].label}`
  return `${slots[0].label}, ${slots[1].label} ou ${slots[2].label}`
}

function partesDataSP(data: Date): { ymd: string; hora: number } {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(data)
    .reduce<Record<string, string>>((acc, parte) => {
      if (parte.type !== "literal") acc[parte.type] = parte.value
      return acc
    }, {})

  return {
    ymd: `${partes.year}-${partes.month}-${partes.day}`,
    hora: Number(partes.hour || "0"),
  }
}

function dataSP(ymd: string, hora = 0, minuto = 0): Date {
  return new Date(
    `${ymd}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00-03:00`
  )
}

function somarDiasSP(ymd: string, dias: number): string {
  const base = dataSP(ymd, 12)
  return partesDataSP(new Date(base.getTime() + dias * 24 * 60 * 60 * 1000)).ymd
}

function inicioFimDiaSP(ymd: string): Pick<
  JanelaAgendaSolicitada,
  "dataInicio" | "dataFim"
> {
  return {
    dataInicio: dataSP(ymd, 0, 0).toISOString(),
    dataFim: dataSP(ymd, 23, 59).toISOString(),
  }
}

function labelDiaAgenda(ymd: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(dataSP(ymd, 12))
}

function detectarJanelaAgenda(texto: string): JanelaAgendaSolicitada | null {
  const normalizado = normalizarTextoBusca(texto)
  const hoje = partesDataSP(new Date())
  let ymd: string | null = null

  if (normalizado.includes("amanha")) {
    ymd = somarDiasSP(hoje.ymd, 1)
  } else if (normalizado.includes("hoje")) {
    ymd = hoje.ymd
  }

  const diasSemana: Array<{ termo: string; indice: number }> = [
    { termo: "domingo", indice: 0 },
    { termo: "segunda", indice: 1 },
    { termo: "terca", indice: 2 },
    { termo: "quarta", indice: 3 },
    { termo: "quinta", indice: 4 },
    { termo: "sexta", indice: 5 },
    { termo: "sabado", indice: 6 },
  ]

  const diaSemana = diasSemana.find((dia) => normalizado.includes(dia.termo))
  if (!ymd && diaSemana) {
    const hojeMeioDia = dataSP(hoje.ymd, 12)
    const indiceHoje = hojeMeioDia.getUTCDay()
    let diff = (diaSemana.indice - indiceHoje + 7) % 7
    const horaPedida = extrairHorarioEscolhido(texto)
    const horaNumero = horaPedida ? Number(horaPedida.replace("h", "")) : null
    if (diff === 0 && (!horaNumero || horaNumero <= hoje.hora)) diff = 7
    ymd = somarDiasSP(hoje.ymd, diff)
  }

  const diaMes = normalizado.match(/\bdia\s+(\d{1,2})\b/)
  if (!ymd && diaMes?.[1]) {
    const dia = Number(diaMes[1])
    if (dia >= 1 && dia <= 31) {
      const [anoAtual, mesAtual, diaAtual] = hoje.ymd.split("-").map(Number)
      let ano = anoAtual
      let mes = mesAtual
      if (dia < diaAtual) {
        mes += 1
        if (mes > 12) {
          mes = 1
          ano += 1
        }
      }
      ymd = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
    }
  }

  if (!ymd) return null

  return {
    ...inicioFimDiaSP(ymd),
    labelDia: labelDiaAgenda(ymd),
    ymd,
    horario: extrairHorarioEscolhido(texto),
  }
}

async function consultarSlotsAgendamento(
  baseUrl: string,
  janela?: JanelaAgendaSolicitada | null
): Promise<SlotAgendamentoOferecido[]> {
  const resultado = await executarFerramenta(
    "consultar_agenda",
    janela
      ? {
          dataInicio: janela.dataInicio,
          dataFim: janela.dataFim,
        }
      : {},
    baseUrl
  )
  const parsed = JSON.parse(resultado) as {
    ok?: boolean
    error?: string
    slots?: Array<{ label?: string; dataIso?: string }>
  }

  if (parsed.ok === false) {
    throw new Error(parsed.error || "Falha ao consultar agenda")
  }

  return (parsed.slots ?? [])
    .filter((slot): slot is { label: string; dataIso: string } =>
      Boolean(slot.label && slot.dataIso)
    )
    .map((slot) => ({
      label: slot.label,
      dataIso: slot.dataIso,
      hora: formatarHoraSlot(slot.dataIso),
    }))
}

async function consultarSlotsProximosAposJanela(
  baseUrl: string,
  janela: JanelaAgendaSolicitada,
  slotsIgnorados: SlotAgendamentoOferecido[] = []
): Promise<SlotAgendamentoOferecido[]> {
  const inicioYmd = somarDiasSP(janela.ymd, 1)
  const fimYmd = somarDiasSP(janela.ymd, 14)
  const proximosSlots = await consultarSlotsAgendamento(baseUrl, {
    ...inicioFimDiaSP(inicioYmd),
    dataFim: dataSP(fimYmd, 23, 59).toISOString(),
    labelDia: labelDiaAgenda(inicioYmd),
    ymd: inicioYmd,
    horario: null,
  })

  return slotsSemIgnorados(proximosSlots, slotsIgnorados).slice(0, 3)
}

async function salvarEmailContato(
  contatoId: string,
  contexto: ContextoContato,
  email: string
): Promise<void> {
  if (contexto.email === email) return

  const { error } = await supabaseAdmin
    .from("contatos")
    .update({ email, atualizadoEm: agora() } as never)
    .eq("id", contatoId)

  if (error) {
    console.error("[Agente] Falha ao salvar email informado:", {
      contatoId,
      erro: error.message,
    })
    throw new Error(`Falha ao salvar e-mail: ${error.message}`)
  }

  contexto.email = email
  await adicionarFatoAoContato(
    contatoId,
    contexto,
    `E-mail informado pelo paciente: ${email}`
  )
}

async function avancarParaAgendamento(
  contatoId: string,
  conversaId: string | null,
  contexto: ContextoContato,
  baseUrl: string
): Promise<void> {
  if (contexto.etapa === "agendamento") return

  const resultado = await executarFerramenta(
    "atualizar_lead",
    {
      contatoId,
      conversaId,
      etapaCorreta: "agendamento",
    },
    baseUrl
  )
  const parsed = JSON.parse(resultado) as { ok?: boolean; error?: string }
  if (parsed.ok === false) {
    throw new Error(parsed.error || "Falha ao avançar para agendamento")
  }

  contexto.etapa = "agendamento"
}

async function montarOfertaSlotsAgendamento(params: {
  chatId: string
  contatoId: string
  contexto: ContextoContato
  baseUrl: string
  textoPaciente: string
  origem: "orcamento"
  slotsIgnorados?: SlotAgendamentoOferecido[]
  reconsulta?: boolean
  janelaForcada?: JanelaAgendaSolicitada | null
}): Promise<string> {
  const {
    chatId,
    contatoId,
    contexto,
    baseUrl,
    textoPaciente,
    origem,
    slotsIgnorados = [],
    reconsulta = false,
    janelaForcada = null,
  } = params
  const janela = janelaForcada ?? detectarJanelaAgenda(textoPaciente)
  const slots = await consultarSlotsAgendamento(baseUrl, janela)
  const periodo = janela ? null : detectarPreferenciaPeriodo(textoPaciente)
  const slotsDisponiveis = slotsSemIgnorados(slots, slotsIgnorados)
  const slotsPreferidos = filtrarSlotsPorPeriodo(slotsDisponiveis, periodo)
  const baseOferta = (
    slotsPreferidos.length > 0 ? slotsPreferidos : slotsDisponiveis
  )
  const slotExato = janela?.horario
    ? baseOferta.find((slot) => slot.hora === janela.horario) ?? null
    : null
  const slotsOferta = (slotExato ? [slotExato] : baseOferta).slice(0, 3)

  console.log("[Agente] Slots consultados para agendamento", {
    contatoId,
    quantidade: slots.length,
    janela: janela?.labelDia,
    horarioSolicitado: janela?.horario,
    periodo,
    oferecidos: slotsOferta.map((slot) => slot.label),
    ignorados: slotsIgnorados.map((slot) => slot.label),
  })

  if (slotsOferta.length === 0) {
    if (janela) {
      const proximosSlots = await consultarSlotsProximosAposJanela(
        baseUrl,
        janela,
        slotsIgnorados
      )

      if (proximosSlots.length > 0) {
        await salvarEstadoAgendamento(chatId, {
          origem,
          slots: proximosSlots,
          slotEscolhido: null,
          janela: null,
          atualizadoEm: agora(),
        })

        return comVocativo(
          contexto,
          `Consultei a agenda para ${janela.labelDia} e não encontrei horários livres nesse dia{nome}. Mas encontrei opções logo na sequência: ${formatarListaSlots(proximosSlots)}. Qual desses fica melhor pra você?`
        )
      }

      return comVocativo(
        contexto,
        `Consultei a agenda para ${janela.labelDia} e não encontrei horários livres nesse dia{nome}. Também não achei horários nos próximos dias. Me confirma se você prefere manhã ou tarde que eu tento buscar uma janela melhor?`
      )
    }

    return "Consultei a agenda agora e não encontrei horários livres nos próximos dias. Me confirma se você prefere manhã ou tarde que eu tento buscar uma janela melhor?"
  }

  await salvarEstadoAgendamento(chatId, {
    origem,
    slots: slotsOferta,
    slotEscolhido: slotExato,
    janela,
    atualizadoEm: agora(),
  })

  if (slotExato) {
    return comVocativo(
      contexto,
      contexto.email
        ? `Esse horário está livre{nome}: ${slotExato.label}. Posso confirmar esse horário pra você?`
        : `Esse horário está livre{nome}: ${slotExato.label}. Pra eu confirmar na agenda e enviar o convite, me passa seu e-mail?`
    )
  }

  return comVocativo(
    contexto,
    reconsulta
      ? `Consultei de novo e tenho ${formatarListaSlots(slotsOferta)}. Qual desses fica melhor pra você?`
      : janela?.horario && !slotExato
        ? `Não encontrei ${janela.horario} livre em ${janela.labelDia}{nome}, mas tenho ${formatarListaSlots(slotsOferta)}. Qual desses fica melhor pra você?`
        : janela
          ? `Perfeito{nome}. Consultei a agenda do Dr. Lucas para ${janela.labelDia} e tenho ${formatarListaSlots(slotsOferta)}. Qual desses fica melhor pra você?`
          : `Perfeito{nome}. Consultei a agenda do Dr. Lucas e tenho ${formatarListaSlots(slotsOferta)}. Qual desses fica melhor pra você?`
  )
}

async function registrarAgendamentoDeterministico(params: {
  contatoId: string
  conversaId: string | null
  contexto: ContextoContato
  baseUrl: string
  slot: SlotAgendamentoOferecido
  email: string
}): Promise<{ ok: true; texto: string } | { ok: false; texto: string }> {
  const { contatoId, conversaId, contexto, baseUrl, slot, email } = params

  console.log("[Agente] Registrando agendamento deterministico", {
    contatoId,
    conversaId,
    slot: slot.label,
    dataIso: slot.dataIso,
  })

  const resultado = await executarFerramenta(
    "registrar_agendamento",
    {
      contatoId,
      conversaId,
      dataHora: slot.dataIso,
      email,
      observacao: `Reunião de diagnóstico online agendada pela Ana Júlia após aprovação comercial. Slot escolhido: ${slot.label}.`,
    },
    baseUrl
  )
  const parsed = JSON.parse(resultado) as {
    ok?: boolean
    error?: string
    agendamento?: { id?: string }
    sincronizado?: boolean
  }

  console.log("[Agente] Resultado registrar_agendamento", {
    contatoId,
    ok: parsed.ok !== false && Boolean(parsed.agendamento),
    agendamentoId: parsed.agendamento?.id,
    sincronizado: parsed.sincronizado,
    erro: parsed.error,
  })

  if (parsed.ok === false || !parsed.agendamento) {
    return {
      ok: false,
      texto: "Esse horário acabou de ficar indisponível.",
    }
  }

  contexto.etapa = "consulta_agendada"
  return {
    ok: true,
    texto: comVocativo(
      contexto,
      `Agendado{nome}! Ficou para ${slot.label}. O convite vai chegar no e-mail ${email}.\n---\nAgora o próximo passo é a reunião com o Dr. Lucas, para ele avaliar seu caso e te orientar com segurança. Se antes disso você precisar remarcar ou cancelar, pode me chamar por aqui.`
    ),
  }
}

function combinarFalhaAgendamentoComOferta(falha: string, oferta: string): string {
  const ofertaNormalizada = normalizarTextoBusca(oferta)
  if (
    ofertaNormalizada.includes("esse horario esta livre") ||
    ofertaNormalizada.includes("pra eu confirmar na agenda")
  ) {
    return oferta
  }
  return `${falha} ${oferta}`
}

async function montarFastPathAgendamento(params: {
  chatId: string
  textoPaciente: string
  contexto: ContextoContato
  contatoId: string
  conversaId: string | null
  baseUrl: string
  orcamentoRespondido: OrcamentoRespondidoContexto | null
}): Promise<string | null> {
  const {
    chatId,
    textoPaciente,
    contexto,
    contatoId,
    conversaId,
    baseUrl,
    orcamentoRespondido,
  } = params
  if (contexto.etapa === "consulta_agendada" || contexto.agendamentoPendente) {
    return null
  }

  const estadoAtual = await obterEstadoAgendamento(chatId)
  // Agendamento so existe depois que o Dr. Lucas respondeu o valor. Antes de
  // 22/07/2026 uma estimativa aprovada tambem abria a agenda — saiu junto com
  // a estimativa automatica, que dava faixa generica sem relacao com o caso.
  const origem = orcamentoRespondido ? "orcamento" : null
  if (!origem) return null

  const emailInformado = extrairEmailDoTexto(textoPaciente)
  const slotsOferecidos = estadoAtual?.slots ?? []
  const janelaSolicitada = detectarJanelaAgenda(textoPaciente)
  const slotEscolhido = janelaSolicitada
    ? null
    : resolverSlotEscolhido(textoPaciente, slotsOferecidos)
  const horarioSolicitado = extrairHorarioEscolhido(textoPaciente)
  const aprovou = pacienteAprovouOrcamento(textoPaciente)
  const preferiuPeriodo = Boolean(detectarPreferenciaPeriodo(textoPaciente))
  const emAgendamento = contexto.etapa === "agendamento"
  const slotPendente = estadoAtual?.slotEscolhido ?? null
  const deveEntrarNoAgendamento =
    aprovou ||
    emailInformado ||
    slotEscolhido ||
    slotPendente ||
    janelaSolicitada ||
    horarioSolicitado ||
    preferiuPeriodo ||
    emAgendamento

  if (!deveEntrarNoAgendamento) return null

  console.log("[Agente] Fast-path de agendamento pos-orcamento", {
    contatoId,
    conversaId,
    etapa: contexto.etapa,
    aprovou,
    emailInformado: Boolean(emailInformado),
    slotEscolhido: slotEscolhido?.label,
    slotPendente: slotPendente?.label,
    janelaSolicitada: janelaSolicitada?.labelDia,
    horarioSolicitado,
    preferiuPeriodo,
    origem,
  })

  await avancarParaAgendamento(contatoId, conversaId, contexto, baseUrl)

  if (emailInformado) {
    await salvarEmailContato(contatoId, contexto, emailInformado)
  }

  const email = emailInformado || contexto.email || null
  const slotParaRegistrar = slotEscolhido ?? slotPendente

  if (janelaSolicitada) {
    return montarOfertaSlotsAgendamento({
      chatId,
      contatoId,
      contexto,
      baseUrl,
      textoPaciente,
      origem,
      janelaForcada: janelaSolicitada,
    })
  }

  if (slotParaRegistrar) {
    if (slotEscolhido) {
      await salvarEstadoAgendamento(chatId, {
        origem,
        slots: slotsOferecidos,
        slotEscolhido,
        janela: estadoAtual?.janela ?? null,
        atualizadoEm: agora(),
      })
    }

    if (!email) {
      return comVocativo(
        contexto,
        `Esse horário funciona, sim{nome}. Pra eu confirmar na agenda e enviar o convite, me passa seu e-mail?`
      )
    }

    const resultadoAgendamento = await registrarAgendamentoDeterministico({
      contatoId,
      conversaId,
      contexto,
      baseUrl,
      slot: slotParaRegistrar,
      email,
    })

    if (resultadoAgendamento.ok) {
      await limparEstadoAgendamento(chatId)
      return resultadoAgendamento.texto
    }

    const novaOferta = await montarOfertaSlotsAgendamento({
      chatId,
      contatoId,
      contexto,
      baseUrl,
      textoPaciente,
      origem,
      slotsIgnorados: [slotParaRegistrar],
      reconsulta: true,
      janelaForcada: estadoAtual?.janela ?? null,
    })
    return combinarFalhaAgendamentoComOferta(resultadoAgendamento.texto, novaOferta)
  }

  if (emailInformado && estadoAtual?.janela) {
    return montarOfertaSlotsAgendamento({
      chatId,
      contatoId,
      contexto,
      baseUrl,
      textoPaciente,
      origem,
      janelaForcada: estadoAtual.janela,
    })
  }

  if (horarioSolicitado) {
    return montarOfertaSlotsAgendamento({
      chatId,
      contatoId,
      contexto,
      baseUrl,
      textoPaciente,
      origem,
    })
  }

  return montarOfertaSlotsAgendamento({
    chatId,
    contatoId,
    contexto,
    baseUrl,
    textoPaciente,
    origem,
  })
}

async function montarOfertaSlotsRemarcacao(params: {
  chatId: string
  contatoId: string
  contexto: ContextoContato
  baseUrl: string
  textoPaciente: string
  agendamentoId: string
  slotsIgnorados?: SlotAgendamentoOferecido[]
  reconsulta?: boolean
}): Promise<string> {
  const {
    chatId,
    contatoId,
    contexto,
    baseUrl,
    textoPaciente,
    agendamentoId,
    slotsIgnorados = [],
    reconsulta = false,
  } = params
  const janela = detectarJanelaAgenda(textoPaciente)
  const slots = await consultarSlotsAgendamento(baseUrl, janela)
  const periodo = janela ? null : detectarPreferenciaPeriodo(textoPaciente)
  const slotsDisponiveis = slotsSemIgnorados(slots, slotsIgnorados)
  const slotsPreferidos = filtrarSlotsPorPeriodo(slotsDisponiveis, periodo)
  const baseOferta = (
    slotsPreferidos.length > 0 ? slotsPreferidos : slotsDisponiveis
  )
  const slotExato = janela?.horario
    ? baseOferta.find((slot) => slot.hora === janela.horario) ?? null
    : null
  const slotsOferta = (slotExato ? [slotExato] : baseOferta).slice(0, 3)

  console.log("[Agente] Slots consultados para remarcacao", {
    contatoId,
    agendamentoId,
    quantidade: slots.length,
    janela: janela?.labelDia,
    horarioSolicitado: janela?.horario,
    periodo,
    oferecidos: slotsOferta.map((slot) => slot.label),
    ignorados: slotsIgnorados.map((slot) => slot.label),
  })

  if (slotsOferta.length === 0) {
    if (janela) {
      const proximosSlots = await consultarSlotsProximosAposJanela(
        baseUrl,
        janela,
        slotsIgnorados
      )

      if (proximosSlots.length > 0) {
        await salvarEstadoAgendamento(chatId, {
          origem: "remarcacao",
          slots: proximosSlots,
          slotEscolhido: null,
          agendamentoId,
          cancelamentoPendente: false,
          atualizadoEm: agora(),
        })

        return comVocativo(
          contexto,
          `Consultei a agenda para ${janela.labelDia} e não encontrei horários livres nesse dia{nome}. Mas encontrei opções logo na sequência: ${formatarListaSlots(proximosSlots)}. Qual desses fica melhor pra você?`
        )
      }

      return comVocativo(
        contexto,
        `Consultei a agenda para ${janela.labelDia} e não encontrei horários livres nesse dia{nome}. Também não achei horários nos próximos dias. Me confirma se você prefere manhã ou tarde que eu tento buscar uma janela melhor?`
      )
    }

    return "Consultei a agenda agora e não encontrei horários livres nos próximos dias. Me confirma se você prefere manhã ou tarde que eu tento buscar uma janela melhor?"
  }

  await salvarEstadoAgendamento(chatId, {
    origem: "remarcacao",
    slots: slotsOferta,
    slotEscolhido: slotExato,
    agendamentoId,
    cancelamentoPendente: false,
    atualizadoEm: agora(),
  })

  if (slotExato) {
    return comVocativo(
      contexto,
      `Esse horário está livre{nome}: ${slotExato.label}. Pode confirmar a remarcação nesse horário?`
    )
  }

  return comVocativo(
    contexto,
    reconsulta
      ? `Consultei de novo e tenho ${formatarListaSlots(slotsOferta)}. Qual desses fica melhor pra você?`
      : janela?.horario && !slotExato
        ? `Não encontrei ${janela.horario} livre em ${janela.labelDia}{nome}, mas tenho ${formatarListaSlots(slotsOferta)}. Qual desses fica melhor pra você?`
        : janela
          ? `Claro{nome}. Consultei a agenda do Dr. Lucas para ${janela.labelDia} e tenho ${formatarListaSlots(slotsOferta)}. Qual desses fica melhor pra você?`
          : `Claro{nome}. Consultei a agenda do Dr. Lucas e tenho ${formatarListaSlots(slotsOferta)}. Qual desses fica melhor pra você?`
  )
}

async function remarcarAgendamentoDeterministico(params: {
  agendamentoId: string
  slot: SlotAgendamentoOferecido
  contexto: ContextoContato
  baseUrl: string
  mensagemPaciente?: string
}): Promise<{ ok: true; texto: string } | { ok: false; texto: string }> {
  const { agendamentoId, slot, contexto, baseUrl, mensagemPaciente } = params
  const resultado = await executarFerramenta(
    "atualizar_agendamento",
    {
      agendamentoId,
      acao: "remarcar",
      novaDataHora: slot.dataIso,
      novoSlotLabel: slot.label,
      ...(mensagemPaciente ? { mensagemPaciente } : {}),
    },
    baseUrl
  )
  const parsed = JSON.parse(resultado) as {
    ok?: boolean
    error?: string
    agendamento?: { id?: string }
  }

  if (parsed.ok === false || !parsed.agendamento) {
    return {
      ok: false,
      texto: "Esse horário acabou de ficar indisponível.",
    }
  }

  contexto.etapa = "consulta_agendada"
  return {
    ok: true,
    texto: comVocativo(
      contexto,
      `Pronto{nome}! Remarquei pra ${slot.label}. O convite atualizado vai chegar no seu e-mail.`
    ),
  }
}

async function cancelarAgendamentoDeterministico(params: {
  agendamentoId: string
  contexto: ContextoContato
  baseUrl: string
  mensagemPaciente?: string
}): Promise<{ ok: true; texto: string } | { ok: false; texto: string }> {
  const { agendamentoId, contexto, baseUrl, mensagemPaciente } = params
  const resultado = await executarFerramenta(
    "atualizar_agendamento",
    {
      agendamentoId,
      acao: "cancelar",
      ...(mensagemPaciente ? { mensagemPaciente } : {}),
    },
    baseUrl
  )
  const parsed = JSON.parse(resultado) as {
    ok?: boolean
    error?: string
    agendamento?: { id?: string }
  }

  if (parsed.ok === false || !parsed.agendamento) {
    return {
      ok: false,
      texto: parsed.error || "NÃ£o consegui cancelar esse agendamento agora.",
    }
  }

  contexto.etapa = "agendamento"
  return {
    ok: true,
    texto: comVocativo(
      contexto,
      "Cancelei aqui{nome}. Se mudar de ideia, é só me chamar."
    ),
  }
}

async function montarFastPathReagendamentoCancelamento(params: {
  chatId: string
  textoPaciente: string
  contexto: ContextoContato
  contatoId: string
  baseUrl: string
}): Promise<string | null> {
  const { chatId, textoPaciente, contexto, contatoId, baseUrl } = params
  const agendamento = contexto.agendamentoPendente
  if (!agendamento) return null

  const estadoAtual = await obterEstadoAgendamento(chatId)
  const estadoDesteAgendamento =
    estadoAtual?.origem === "remarcacao" &&
    estadoAtual.agendamentoId === agendamento.id
      ? estadoAtual
      : null
  const pedidoRemarcacao = detectarPedidoRemarcacao(textoPaciente)
  const pedidoCancelamento = detectarPedidoCancelamento(textoPaciente)

  if (estadoDesteAgendamento?.cancelamentoPendente) {
    if (ehRespostaAfirmativaCurta(textoPaciente) || pedidoCancelamento) {
      const resultado = await cancelarAgendamentoDeterministico({
        agendamentoId: agendamento.id,
        contexto,
        baseUrl,
        mensagemPaciente: textoPaciente,
      })
      await limparEstadoAgendamento(chatId)
      return resultado.texto
    }

    if (detectarNegacaoCurta(textoPaciente)) {
      await limparEstadoAgendamento(chatId)
      return comVocativo(
        contexto,
        `Sem problema{nome}. Mantive sua avaliação de ${agendamento.label}.`
      )
    }
  }

  const slotsOferecidos = estadoDesteAgendamento?.slots ?? []
  const slotEscolhido = resolverSlotEscolhido(textoPaciente, slotsOferecidos)
  const slotPendente = estadoDesteAgendamento?.slotEscolhido ?? null
  const horarioSolicitado = extrairHorarioEscolhido(textoPaciente)
  const preferiuPeriodo = Boolean(detectarPreferenciaPeriodo(textoPaciente))

  if (slotPendente && ehRespostaAfirmativaCurta(textoPaciente)) {
    const resultado = await remarcarAgendamentoDeterministico({
      agendamentoId: agendamento.id,
      slot: slotPendente,
      contexto,
      baseUrl,
      mensagemPaciente: textoPaciente,
    })
    if (resultado.ok) {
      await limparEstadoAgendamento(chatId)
      return resultado.texto
    }
  }

  if (slotEscolhido) {
    const resultado = await remarcarAgendamentoDeterministico({
      agendamentoId: agendamento.id,
      slot: slotEscolhido,
      contexto,
      baseUrl,
      mensagemPaciente: textoPaciente,
    })
    if (resultado.ok) {
      await limparEstadoAgendamento(chatId)
      return resultado.texto
    }

    const novaOferta = await montarOfertaSlotsRemarcacao({
      chatId,
      contatoId,
      contexto,
      baseUrl,
      textoPaciente,
      agendamentoId: agendamento.id,
      slotsIgnorados: [slotEscolhido],
      reconsulta: true,
    })
    return `${resultado.texto} ${novaOferta}`
  }

  if (pedidoCancelamento) {
    await salvarEstadoAgendamento(chatId, {
      origem: "remarcacao",
      slots: slotsOferecidos,
      slotEscolhido: null,
      agendamentoId: agendamento.id,
      cancelamentoPendente: true,
      atualizadoEm: agora(),
    })
    return comVocativo(
      contexto,
      `Tem certeza que quer cancelar a avaliação de ${agendamento.label}{nome}? Se preferir, posso só remarcar.`
    )
  }

  if (pedidoRemarcacao || horarioSolicitado || preferiuPeriodo) {
    return montarOfertaSlotsRemarcacao({
      chatId,
      contatoId,
      contexto,
      baseUrl,
      textoPaciente,
      agendamentoId: agendamento.id,
    })
  }

  return null
}

async function obterUltimoOrcamentoRespondido(
  contatoId: string
): Promise<OrcamentoRespondidoContexto | null> {
  const { data, error } = await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .select("id, respondidoEm, observacoes, resumoCaso")
    .eq("contatoId", contatoId)
    .not("respondidoEm", "is", null)
    .is("canceladoEm", null)
    .order("respondidoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn("[Agente] Erro ao buscar orcamento respondido:", error.message)
    return null
  }

  return (data as OrcamentoRespondidoContexto | null) ?? null
}

function anexarFatoContexto(
  sobreOPaciente: string | undefined,
  fato: string
): string {
  if (sobreOPaciente?.includes(fato)) return sobreOPaciente
  return [sobreOPaciente, fato].filter(Boolean).join("\n---\n")
}

function montarResumoOrcamento(
  contexto: ContextoContato,
  textoPaciente: string
): string {
  const partes = [
    contexto.nome ? `Nome: ${contexto.nome}` : null,
    contexto.procedimento ? `Procedimento: ${contexto.procedimento}` : null,
    contexto.sobreOPaciente
      ? `Informações coletadas: ${contexto.sobreOPaciente}`
      : null,
    textoPaciente ? `Última resposta do paciente: ${textoPaciente}` : null,
  ].filter(Boolean)

  return (
    partes.join("\n") ||
    "Paciente qualificado no WhatsApp solicitando orçamento exato com Dr. Lucas."
  )
}

async function adicionarFatoAoContato(
  contatoId: string,
  contexto: ContextoContato,
  fato: string
): Promise<void> {
  const novoSobrePaciente = anexarFatoContexto(contexto.sobreOPaciente, fato)
  if (novoSobrePaciente === contexto.sobreOPaciente) return

  const { error } = await supabaseAdmin
    .from("contatos")
    .update({
      sobreOPaciente: novoSobrePaciente,
      atualizadoEm: agora(),
    } as never)
    .eq("id", contatoId)

  if (error) {
    console.error("[Agente] Fast-path falhou ao salvar fato:", {
      contatoId,
      erro: error.message,
    })
    throw new Error(`Falha ao salvar qualificação: ${error.message}`)
  }

  contexto.sobreOPaciente = novoSobrePaciente
}

async function registrarMensagemAgenteLocal(params: {
  contatoId: string
  conversaId: string | null
  conteudo: string
}): Promise<void> {
  const { contatoId, conversaId, conteudo } = params
  if (!conversaId) return

  const tsAgora = agora()
  const { error } = await supabaseAdmin.from("mensagens_whatsapp").insert({
    id: criarId(),
    conversaId,
    contatoId,
    messageIdWhatsapp: `agente_${criarId()}`,
    tipo: "texto" as never,
    conteudo,
    remetente: "agente" as never,
  })

  if (error) {
    console.error("[Agente] Falha ao registrar mensagem do agente:", {
      contatoId,
      conversaId,
      erro: error.message,
    })
    return
  }

  await supabaseAdmin
    .from("conversas")
    .update({ ultimaMensagemEm: tsAgora, atualizadoEm: tsAgora })
    .eq("id", conversaId)
}

async function enviarRespostaAgente(params: {
  chatId: string
  whatsapp: string
  contatoId: string | null
  conversaId: string | null
  configWa: { uazapiUrl: string; instanceToken: string }
  textoUsuario: string
  textoResposta: string
}): Promise<boolean> {
  const {
    chatId,
    whatsapp,
    contatoId,
    conversaId,
    configWa,
    textoUsuario,
    textoResposta,
  } = params
  const textoFinal = humanizarTexto(textoResposta)
  const segmentos = segmentarResposta(textoFinal)

  if (segmentos.length === 0) return false

  for (let i = 0; i < segmentos.length; i++) {
    const segmento = segmentos[i]
    console.log("[Agente] Enviando segmento WhatsApp", {
      contatoId,
      conversaId,
      indice: i + 1,
      total: segmentos.length,
      caracteres: segmento.length,
    })

    try {
      await enviarDigitando(
        configWa.uazapiUrl,
        configWa.instanceToken,
        chatId,
        true
      )
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
      await registrarMensagemAgenteLocal({
        contatoId,
        conversaId,
        conteudo: segmento,
      })
    }

    if (i < segmentos.length - 1) {
      const delay = Math.floor(Math.random() * 601) + 600
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  await adicionarAMemoria(chatId, { role: "user", content: textoUsuario })
  await adicionarAMemoria(chatId, { role: "assistant", content: textoFinal })
  return true
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
  const inicioProcessamento = Date.now()
  const buffer = await obterELimparBuffer(chatId)
  console.log("[Agente] Processamento iniciado", {
    chatId,
    mensagensBuffer: buffer.length,
  })
  if (buffer.length === 0) return null

  const textoBuffer = buffer.map((m) => m.conteudo).join("\n")
  const recebeuImagem = buffer.some((m) => m.tipo === "imagem")
  const whatsapp = extrairNumero(chatId)

  const configWa = await obterConfigWhatsapp()
  if (!configWa?.instanceToken || !configWa?.uazapiUrl) {
    console.warn(
      "[Agente] ConfigWhatsapp não encontrada ou incompleta — não será possível responder"
    )
    return null
  }
  const configEnvio = {
    uazapiUrl: configWa.uazapiUrl,
    instanceToken: configWa.instanceToken,
  }

  const baseUrl = getBaseUrl()

  let contextoContato: ContextoContato = {}
  let contatoId: string | null = null
  let conversaId: string | null = null
  let primeiraRespostaDaConversa = false
  let orcamentoRespondidoAtual: OrcamentoRespondidoContexto | null = null
  let pacienteAprovouOrcamentoRespondido = false
  let orcamentoPendenteConsultivo = false
  const enviarResultadosDuranteEsperaOrcamento = async () => {
    if (!contatoId) return

    try {
      await enviarResultadosProcedimento({
        contatoId,
        conversaId,
        whatsapp,
        configWa: configEnvio,
        procedimentoInteresse: contextoContato.procedimento,
        origem: "orcamento_exato_pendente",
        chatId,
      })
    } catch (err) {
      console.error(
        "[Agente] Falha best-effort ao enviar resultados durante espera do orcamento:",
        err
      )
    }
  }

  try {
    const resultadoPaciente = JSON.parse(
      await executarFerramenta("consultar_paciente", { whatsapp }, baseUrl)
    )
    if (resultadoPaciente.contato) {
      if (resultadoPaciente.contato.tipo === "paciente") {
        console.log("[Agente] Contato paciente silenciado", {
          chatId,
          contatoId: resultadoPaciente.contato.id,
        })
        return {
          contatoId: resultadoPaciente.contato.id,
          conversaId: resultadoPaciente.conversa?.id || null,
        }
      }

      // Antes existia logica de STATUSES_SILENCIO/STATUSES_RETORNO aqui, mas
      // ambos arrays estavam vazios desde a refatoracao do funil comercial
      // (JLAU-...). Removido o codigo morto. Se quiser reativar "novo ciclo
      // pra paciente de retorno", `abrirNovoCiclo` continua disponivel em
      // `lib/agente/kanban-sync.ts` — basta plugar aqui novamente.
      const nomeAtual = resultadoPaciente.contato.nome ?? ""
      const nomePerfilWhatsappNaoConfirmado =
        resultadoPaciente.contato.origem === "whatsapp" &&
        resultadoPaciente.contato.tipo === "lead" &&
        !temNomeAutodeclarado(resultadoPaciente.sobreOPaciente, nomeAtual)
      const nomePaciente =
        nomeAtual &&
        !nomeAtual.startsWith("WhatsApp ") &&
        !nomePerfilWhatsappNaoConfirmado
          ? nomeAtual
          : undefined
      contextoContato = {
        nome: nomePaciente,
        email: resultadoPaciente.contato.email,
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
      primeiraRespostaDaConversa =
        Boolean(conversaId) && !(await conversaTemRespostaAgente(conversaId))

      if (primeiraRespostaDaConversa) {
        await Promise.all([
          limparMemoria(chatId),
          limparEstadoAgendamento(chatId),
        ])
        console.log(
          "[Agente] Memoria antiga limpa para primeira resposta da conversa",
          {
            chatId,
            contatoId,
            conversaId,
          }
        )
      } else if (resultadoPaciente.criadoAgora) {
        await limparMemoria(chatId)
        console.log(`[Agente] Memoria antiga limpa para novo contato ${chatId}`)
      }

      if (
        ["acolhimento", "qualificacao"].includes(
          contextoContato.etapa ?? ""
        ) &&
        (resultadoPaciente.criadoAgora ||
          !temIntencaoInicialRegistrada(contextoContato.sobreOPaciente))
      ) {
        await persistirIntencaoInicialLead({
          contatoId,
          conversaId,
          textoPaciente: textoBuffer,
          contextoContato,
          baseUrl,
        })
      }
    }
  } catch (error) {
    console.error("[Agente] Erro ao consultar paciente:", error)
  }

  const nomeAutodeclarado = extrairNomeAutodeclarado(textoBuffer)
  if (contatoId && nomeAutodeclarado) {
    const marcadorNome = `Nome informado pelo paciente: ${nomeAutodeclarado}`
    const precisaPersistirNome =
      contextoContato.nome !== nomeAutodeclarado ||
      !temNomeAutodeclarado(contextoContato.sobreOPaciente, nomeAutodeclarado)

    if (precisaPersistirNome) {
      try {
        const resultadoNome = await executarFerramenta(
          "atualizar_lead",
          {
            contatoId,
            conversaId,
            nome: nomeAutodeclarado,
          },
          baseUrl
        )
        const parsed = JSON.parse(resultadoNome)
        if (parsed?.ok === true) {
          contextoContato.nome = nomeAutodeclarado
          contextoContato.sobreOPaciente = anexarFatoContexto(
            contextoContato.sobreOPaciente,
            marcadorNome
          )
        }
      } catch (err) {
        console.error("[Agente] Erro ao persistir nome autodeclarado:", err)
      }
    }
  }

  const interesseQualificacao = detectarInteresseQualificacao(textoBuffer)
  const etapaPermiteSincronizarInteresse = [
    "acolhimento",
    "qualificacao",
    "orcamento",
  ].includes(contextoContato.etapa ?? "")
  if (
    contatoId &&
    interesseQualificacao &&
    etapaPermiteSincronizarInteresse &&
    devePersistirProcedimentoInteresse(
      contextoContato.procedimento,
      interesseQualificacao.procedimentoInteresse
    )
  ) {
    try {
      const resultadoQualificacao = await executarFerramenta(
        "atualizar_lead",
        {
          contatoId,
          conversaId,
          procedimentoInteresse: interesseQualificacao.procedimentoInteresse,
          sobreOPacienteAdicionar: interesseQualificacao.fato,
          etapaCorreta:
            contextoContato.etapa === "acolhimento" ? "qualificacao" : "manter",
        },
        baseUrl
      )
      const parsed = JSON.parse(resultadoQualificacao)
      if (parsed?.ok === true) {
        contextoContato.procedimento =
          interesseQualificacao.procedimentoInteresse
        if (contextoContato.etapa === "acolhimento") {
          contextoContato.etapa = "qualificacao"
        }
        contextoContato.sobreOPaciente = anexarFatoContexto(
          contextoContato.sobreOPaciente,
          interesseQualificacao.fato
        )
      }
    } catch (err) {
      console.error("[Agente] Erro ao sincronizar qualificacao:", err)
    }
  }

  if (contatoId) {
    const { data: contatoResponsavel } = await supabaseAdmin
      .from("contatos")
      .select("responsavelId, statusFunil")
      .eq("id", contatoId)
      .maybeSingle()

    const { data: agendamentoRealizado } = await supabaseAdmin
      .from("agendamentos")
      .select("id")
      .eq("contatoId", contatoId)
      .not("realizadoEm", "is", null)
      .limit(1)
      .maybeSingle()

    const responsavelHumanoAtivo =
      contatoResponsavel?.responsavelId &&
      contatoResponsavel.statusFunil !== "consulta_agendada"
    const atendimentoHumanoAtivo =
      contatoResponsavel?.statusFunil === "atendimento_humano"
    const atendimentoRealizado = Boolean(agendamentoRealizado)

    if (responsavelHumanoAtivo || atendimentoHumanoAtivo || atendimentoRealizado) {
      console.log(
        `[Agente] Atendimento humano ativo no contato ${contatoId} - automacao pausada`
      )
      return null
    }

    // Orcamento pendente nao e handoff humano: a Ana Julia continua consultiva,
    // mas nao pode criar novo orcamento nem iniciar agenda antes do valor voltar.
    const { data: contatoHandoff } = await supabaseAdmin
      .from("contatos")
      .select("aguardandoOrcamentoHumano")
      .eq("id", contatoId)
      .maybeSingle()

    if (
      (contatoHandoff as { aguardandoOrcamentoHumano?: boolean })
        ?.aguardandoOrcamentoHumano
    ) {
      orcamentoPendenteConsultivo = true
      if (ehRespostaAfirmativaCurta(textoBuffer)) {
        const memoriaAtual = await obterMemoria(chatId)
        if (assistenteJaAvisouAguardandoOrcamento(memoriaAtual)) {
          console.log("[Agente] orcamento_pendente_ack_silencioso", {
            contatoId,
            conversaId,
          })
          return null
        }

        const textoAguardo = comVocativo(
          contextoContato,
          "Show{nome}. Assim que o Dr. Lucas retornar, te aviso por aqui."
        )
        await enviarRespostaAgente({
          chatId,
          whatsapp,
          contatoId,
          conversaId,
          configWa: configEnvio,
          textoUsuario: textoBuffer,
          textoResposta: textoAguardo,
        })
        return { contatoId, conversaId }
      }

      if (ehPedidoStatusOrcamentoPendente(textoBuffer)) {
        console.log("[Agente] orcamento_pendente_status", {
          contatoId,
          conversaId,
        })
        await enviarRespostaAgente({
          chatId,
          whatsapp,
          contatoId,
          conversaId,
          configWa: configEnvio,
          textoUsuario: textoBuffer,
          textoResposta: montarRespostaStatusOrcamentoPendente(contextoContato),
        })
        return { contatoId, conversaId }
      }

      if (ehPedidoAgendamentoDuranteOrcamentoPendente(textoBuffer)) {
        console.log("[Agente] orcamento_pendente_agendamento_bloqueado", {
          contatoId,
          conversaId,
        })
        await enviarRespostaAgente({
          chatId,
          whatsapp,
          contatoId,
          conversaId,
          configWa: configEnvio,
          textoUsuario: textoBuffer,
          textoResposta: montarRespostaAgendamentoDuranteOrcamentoPendente(
            contextoContato
          ),
        })
        return { contatoId, conversaId }
      }

      console.log("[Agente] orcamento_pendente_consultivo", {
        contatoId,
        conversaId,
      })
    }
  }

  if (conversaId) {
    const { data: conversa } = await supabaseAdmin
      .from("conversas")
      .select("modoConversa, iaResponde")
      .eq("id", conversaId)
      .maybeSingle()

    if (conversa?.modoConversa === "humano") {
      console.error(
        `[Agente] Conversa ${conversaId} em modo humano — IA não responde`
      )
      return null
    }

    // Quando iaResponde=false, a automacao deve permanecer pausada ate
    // reabertura explicita pelo fluxo operacional.
    if ((conversa as { iaResponde?: boolean })?.iaResponde === false) {
      console.log(
        `[Agente] Conversa ${conversaId} com iaResponde=false — IA nao responde`
      )
      return null
    }
  }

  if (contatoId) {
    orcamentoRespondidoAtual = await obterUltimoOrcamentoRespondido(contatoId)
    if (orcamentoRespondidoAtual) {
      contextoContato.orcamentoRespondido = {
        valor: extrairValorOrcamento(orcamentoRespondidoAtual.observacoes),
        pdfUrl: extrairPdfOrcamento(orcamentoRespondidoAtual.observacoes),
        respondidoEm: orcamentoRespondidoAtual.respondidoEm,
      }
    }

    pacienteAprovouOrcamentoRespondido = Boolean(
      orcamentoRespondidoAtual && pacienteAprovouOrcamento(textoBuffer)
    )

    if (pacienteAprovouOrcamentoRespondido) {
      try {
        await executarFerramenta(
          "atualizar_lead",
          {
            contatoId,
            conversaId,
            etapaCorreta: "agendamento",
          },
          baseUrl
        )
        contextoContato.etapa = "agendamento"
      } catch (err) {
        console.error("[Agente] Erro ao avancar lead para agendamento:", err)
      }
    }
  }

  try {
    await enviarDigitando(
      configEnvio.uazapiUrl,
      configEnvio.instanceToken,
      chatId,
      true
    )
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
        .is("realizadoEm", null)
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

  let enviouResposta = false

  try {
    const memoria = await obterMemoria(chatId)

    if (
      deveUsarFastPathAbertura(
        contextoContato,
        memoria,
        primeiraRespostaDaConversa
      )
    ) {
      console.log("[Agente] Fast-path de abertura obrigatoria usado", {
        contatoId,
        conversaId,
        etapa: contextoContato.etapa,
        primeiraRespostaDaConversa,
      })

      await enviarRespostaAgente({
        chatId,
        whatsapp,
        contatoId,
        conversaId,
        configWa: configEnvio,
        textoUsuario: textoBuffer,
        textoResposta: montarAberturaObrigatoria(textoBuffer),
      })

      return contatoId ? { contatoId, conversaId } : null
    }

    if (deveUsarFastPathPosNome(textoBuffer, contextoContato, memoria)) {
      console.log("[Agente] Fast-path pos-nome com intencao inicial usado", {
        contatoId,
        conversaId,
        etapa: contextoContato.etapa,
        procedimento: contextoContato.procedimento,
      })

      // O pos-nome ja entra na qualificacao. Sem esta sincronia a proxima
      // resposta do paciente cairia fora de `montarFastPathQualificacao`
      // (que exige etapa === "qualificacao") e voltaria pro loop da OpenAI.
      if (contatoId && contextoContato.etapa !== "qualificacao") {
        try {
          await executarFerramenta(
            "atualizar_lead",
            { contatoId, conversaId, etapaCorreta: "qualificacao" },
            baseUrl
          )
          contextoContato.etapa = "qualificacao"
        } catch (err) {
          console.warn(
            "[Agente] Falha ao mover lead para qualificacao apos o nome:",
            err
          )
        }
      }

      await enviarRespostaAgente({
        chatId,
        whatsapp,
        contatoId,
        conversaId,
        configWa: configEnvio,
        textoUsuario: textoBuffer,
        textoResposta: montarRespostaPosNome(contextoContato),
      })

      return contatoId ? { contatoId, conversaId } : null
    }


    const pacienteAceitouQualificacao = consentiuComQualificacao(
      textoBuffer,
      memoria
    )

    if (
      contatoId &&
      pacienteAceitouQualificacao &&
      contextoContato.etapa !== "qualificacao"
    ) {
      try {
        await executarFerramenta(
          "atualizar_lead",
          {
            contatoId,
            conversaId,
            etapaCorreta: "qualificacao",
          },
          baseUrl
        )
        contextoContato.etapa = "qualificacao"
      } catch (err) {
        console.error(
          "[Agente] Erro ao sincronizar qualificacao apos aceite:",
          err
        )
      }
    }

    const pacienteRespondeuQualificacao = respondeuPerguntaQualificacao(
      textoBuffer,
      memoria,
      contextoContato.etapa
    )

    if (
      contatoId &&
      ehRespostaAfirmativaCurta(textoBuffer) &&
      assistentePediuRetryOrcamento(memoria)
    ) {
      console.log(
        "[Agente] Fast-path retry de orçamento após aceite do paciente",
        {
          contatoId,
          conversaId,
        }
      )

      const resultadoOrcamento = await executarFerramenta(
        "gerar_orcamento",
        {
          contatoId,
          conversaId,
          resumoCaso: montarResumoOrcamento(contextoContato, textoBuffer),
          prioridade: "normal",
        },
        baseUrl
      )
      const parsed = JSON.parse(resultadoOrcamento)
      let enviarResultadosOrcamentoPendente = false
      const textoRetry =
        parsed?.ok === true
          ? montarRespostaFotoQualificacaoCompleta(contextoContato)
          : comVocativo(
              contextoContato,
              "Certo{nome}. Deixei seu caso separado aqui e sigo com seu orçamento por aqui."
            )

      if (parsed?.ok === true) {
        contextoContato.etapa = "orcamento"
        enviarResultadosOrcamentoPendente = true
      }

      const enviouRetry = await enviarRespostaAgente({
        chatId,
        whatsapp,
        contatoId,
        conversaId,
        configWa: configEnvio,
        textoUsuario: textoBuffer,
        textoResposta: textoRetry,
      })

      if (enviouRetry && enviarResultadosOrcamentoPendente) {
        await enviarResultadosDuranteEsperaOrcamento()
      }
      return { contatoId, conversaId }
    }

    if (contatoId) {
      const fastPathReagendamentoCancelamento =
        await montarFastPathReagendamentoCancelamento({
          chatId,
          textoPaciente: textoBuffer,
          contexto: contextoContato,
          contatoId,
          baseUrl,
        })

      if (fastPathReagendamentoCancelamento) {
        console.log(
          "[Agente] Fast-path de remarcacao/cancelamento respondeu sem OpenAI",
          {
            contatoId,
            conversaId,
            etapa: contextoContato.etapa,
            agendamentoId: contextoContato.agendamentoPendente?.id,
          }
        )

        enviouResposta = await enviarRespostaAgente({
          chatId,
          whatsapp,
          contatoId,
          conversaId,
          configWa: configEnvio,
          textoUsuario: textoBuffer,
          textoResposta: fastPathReagendamentoCancelamento,
        })

        return { contatoId, conversaId }
      }

      const fastPathAgendamento = await montarFastPathAgendamento({
        chatId,
        textoPaciente: textoBuffer,
        contexto: contextoContato,
        contatoId,
        conversaId,
        baseUrl,
        orcamentoRespondido: orcamentoRespondidoAtual,
      })

      if (fastPathAgendamento) {
        console.log("[Agente] Fast-path de agendamento respondeu sem OpenAI", {
          contatoId,
          conversaId,
          etapa: contextoContato.etapa,
        })

        enviouResposta = await enviarRespostaAgente({
          chatId,
          whatsapp,
          contatoId,
          conversaId,
          configWa: configEnvio,
          textoUsuario: textoBuffer,
          textoResposta: fastPathAgendamento,
        })

        return { contatoId, conversaId }
      }
    }

    const fastPath = montarFastPathQualificacao({
      textoPaciente: textoBuffer,
      contexto: contextoContato,
      memoria,
      pacienteAceitouQualificacao,
      recebeuImagem,
    })

    if (fastPath && contatoId) {
      console.log("[Agente] Fast-path de qualificação usado", {
        contatoId,
        conversaId,
        tipo: fastPath.tipo,
      })

      if (fastPath.fato) {
        await adicionarFatoAoContato(contatoId, contextoContato, fastPath.fato)
      }

      let textoRespostaFastPath = fastPath.texto
      let enviarResultadosOrcamentoPendente = false
      if (fastPath.acionarOrcamento) {
        const resultadoOrcamento = await executarFerramenta(
          "gerar_orcamento",
          {
            contatoId,
            conversaId,
            resumoCaso: montarResumoOrcamento(contextoContato, textoBuffer),
            prioridade: "normal",
          },
          baseUrl
        )
        const parsed = JSON.parse(resultadoOrcamento)
        if (parsed?.ok !== true) {
          textoRespostaFastPath =
            "Recebi a foto. Só preciso tentar enviar seus dados ao Dr. Lucas novamente. Me manda só um ok que eu sigo por aqui?"
        } else {
          contextoContato.etapa = "orcamento"
          enviarResultadosOrcamentoPendente = true
        }
      }

      enviouResposta = await enviarRespostaAgente({
        chatId,
        whatsapp,
        contatoId,
        conversaId,
        configWa: configEnvio,
        textoUsuario: textoBuffer,
        textoResposta: textoRespostaFastPath,
      })

      if (enviouResposta && enviarResultadosOrcamentoPendente) {
        await enviarResultadosDuranteEsperaOrcamento()
      }

      return { contatoId, conversaId }
    }

    console.log("[Agente] Usando loop OpenAI", {
      contatoId,
      conversaId,
      etapa: contextoContato.etapa,
      pacienteAceitouQualificacao,
      pacienteRespondeuQualificacao,
    })

    const systemPrompt = await gerarSystemPrompt(contextoContato)
    const mensagens: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...memoria,
      ...(orcamentoRespondidoAtual
        ? [
            {
              role: "system" as const,
              content: `Ja existe orcamento respondido pelo Dr. Lucas para este contato (${contextoContato.orcamentoRespondido?.valor ?? "valor registrado"}). Nao chame gerar_orcamento novamente neste ciclo. Se o paciente aprovar ou pedir para marcar, conduza para agendamento: primeiro consulte a agenda e ofereca 2-3 slots reais; peca e-mail somente depois que o paciente escolher um slot.`,
            },
          ]
        : []),
      ...(pacienteAprovouOrcamentoRespondido
        ? [
            {
              role: "system" as const,
              content:
                "O paciente acabou de aprovar o orcamento ja enviado. Responda conduzindo para agendamento. Nao diga que enviou dados ao Dr. Lucas, nao prometa novo orcamento e nao chame gerar_orcamento.",
            },
          ]
        : []),
      ...(pacienteAceitouQualificacao
        ? [
            {
              role: "system" as const,
              content:
                "O paciente acabou de aceitar responder perguntas de qualificacao para orcamento. Nesta rodada, NAO chame buscar_conteudo nem enviar_midia. Inicie a qualificacao com a proxima pergunta concreta, uma pergunta por vez.",
            },
          ]
        : []),
      ...(pacienteRespondeuQualificacao
        ? [
            {
              role: "system" as const,
              content:
                "O paciente acabou de responder uma pergunta de qualificacao. Nesta rodada, trate a mensagem como dado do cadastro: atualize o lead se fizer sentido, NAO chame buscar_conteudo nem enviar_midia, e faca a proxima pergunta concreta de qualificacao. Excecao: se o paciente pedir foto/video explicitamente, a regra visual se aplica.",
            },
          ]
        : []),
      ...(orcamentoPendenteConsultivo
        ? [
            {
              role: "system" as const,
              content:
                "O orçamento exato já foi enviado para o Dr. Lucas e ainda está pendente. A Ana Julia deve ficar em modo consultivo: responda dúvidas sobre Dr. Lucas, clínica, procedimento, recuperação, pagamento, resultados ou próximos passos usando as ferramentas permitidas quando necessário. Não chame gerar_orcamento, não avance para agendamento, não registre agenda e não prometa valor antes da resposta do Dr. Lucas. Se o paciente pedir preço/status, diga que está aguardando o Dr. Lucas definir o valor certinho e que avisará por aqui. Se pedir para falar com humano, use acionar_atendimento_humano.",
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
      !pacienteRespondeuQualificacao &&
      temNomeAcolhido &&
      (gatilhoVisual || (gatilhoProcedimento && contextoProntoParaMidia))
    const forcarEnvioMidia =
      !pacienteRespondeuQualificacao &&
      temNomeAcolhido &&
      (gatilhoVisual || (gatilhoProcedimento && contextoProntoParaMidia))

    const ferramentasPermitidasOrcamentoPendente = new Set([
      "buscar_conteudo",
      "consultar_procedimentos",
      "enviar_midia",
      "acionar_atendimento_humano",
    ])
    const ferramentasDaRodada = orcamentoPendenteConsultivo
      ? ferramentasAgente.filter(
          (tool) =>
            tool.type !== "function" ||
            ferramentasPermitidasOrcamentoPendente.has(tool.function.name)
        )
      : pacienteAceitouQualificacao || pacienteRespondeuQualificacao
        ? ferramentasAgente.filter(
            (tool) =>
              tool.type !== "function" ||
              (tool.function.name !== "buscar_conteudo" &&
                tool.function.name !== "enviar_midia")
          )
        : ferramentasAgente

    if (deadlineAproximando(inicioProcessamento)) {
      console.warn("[Agente] Deadline antes do OpenAI - enviando fallback", {
        contatoId,
        conversaId,
        etapa: contextoContato.etapa,
      })
      enviouResposta = await enviarRespostaAgente({
        chatId,
        whatsapp,
        contatoId,
        conversaId,
        configWa: configEnvio,
        textoUsuario: textoBuffer,
        textoResposta: montarFallbackDeadline(contextoContato),
      })
      return contatoId ? { contatoId, conversaId } : null
    }

    console.log("[Agente] Chamando OpenAI", {
      contatoId,
      conversaId,
      etapa: contextoContato.etapa,
    })
    let resposta = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: mensagens,
        tools: ferramentasDaRodada,
        tool_choice: forcarBuscaConteudo
          ? { type: "function", function: { name: "buscar_conteudo" } }
          : "auto",
      },
      {
        timeout: timeoutOpenAI(inicioProcessamento),
      }
    )
    console.log("[Agente] OpenAI respondeu", {
      contatoId,
      conversaId,
      toolCalls: resposta.choices[0]?.message?.tool_calls?.length ?? 0,
      temTexto: Boolean(resposta.choices[0]?.message?.content),
    })

    let iteracoes = 0
    // Por padrao deixamos o GPT escolher, mas se acabou de listar midias com
    // resultado nao vazio, a proxima iteracao EXIGE enviar_midia — impede a
    // alucinacao "acabei de enviar uma foto" sem chamar a tool.
    let proximoToolChoice:
      | "auto"
      | { type: "function"; function: { name: string } } = "auto"
    let enviouMidiaNestaRodada = false
    let gerouOrcamentoNestaRodada = false
    let enviarResultadosOrcamentoPendenteAposResposta = false
    let textoRespostaForcado: string | null = null

    while (
      resposta.choices[0]?.message?.tool_calls &&
      resposta.choices[0].message.tool_calls.length > 0 &&
      iteracoes < MAX_TOOL_ITERATIONS
    ) {
      if (deadlineAproximando(inicioProcessamento)) {
        textoRespostaForcado = montarFallbackDeadline(contextoContato)
        console.warn(
          "[Agente] Deadline antes de processar tools - usando fallback",
          {
            contatoId,
            conversaId,
            iteracoes,
          }
        )
        break
      }

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
          "acionar_atendimento_humano",
        ])
        if (toolsComIds.has(fn.name)) {
          if (contatoId) args.contatoId = contatoId
          if (conversaId) args.conversaId = conversaId
        }

        if (deadlineAproximando(inicioProcessamento)) {
          textoRespostaForcado = montarFallbackDeadline(contextoContato)
          console.warn(
            "[Agente] Deadline antes de executar tool - usando fallback",
            {
              contatoId,
              conversaId,
              ferramenta: fn.name,
              iteracoes,
            }
          )
          break
        }

        const resultado = await executarFerramenta(fn.name, args, baseUrl)
        let enviouMidiaAgora = false

        // Lógica anti-alucinação: se busca retornou mídia nova e o momento
        // permite, próxima iteração EXIGE enviar_midia.
        if (
          fn.name === "buscar_conteudo" &&
          forcarBuscaConteudo &&
          forcarEnvioMidia
        ) {
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

        if (fn.name === "gerar_orcamento") {
          try {
            const parsed = JSON.parse(resultado)
            gerouOrcamentoNestaRodada =
              gerouOrcamentoNestaRodada ||
              (parsed?.ok === true && parsed?.jaRespondido !== true)
            if (parsed?.ok === true && parsed?.jaRespondido !== true) {
              contextoContato.etapa = "orcamento"
              enviarResultadosOrcamentoPendenteAposResposta = true
              textoRespostaForcado =
                montarRespostaFotoQualificacaoCompleta(contextoContato)
            }
            if (parsed?.jaRespondido === true) {
              mensagens.push({
                role: "system",
                content:
                  "A tool informou que ja existe orcamento respondido. Nao diga que enviou dados agora; conduza para agendamento ou tire duvidas sobre o orcamento ja enviado.",
              })
            }
          } catch {
            // resposta invalida - segue fluxo normal
          }
        }

        mensagens.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultado,
        })

        if (textoRespostaForcado) break

        if (enviouMidiaAgora) {
          mensagens.push({
            role: "system",
            content:
              "A midia foi enviada com sucesso. Agora responda em texto e avance a conversa: se ainda esta qualificando, faca a proxima pergunta de qualificacao. Nao encerre a rodada apenas com a midia.",
          })
        }
      }

      if (textoRespostaForcado) break

      proximoToolChoice = forcarEnviarMidiaNext
        ? { type: "function", function: { name: "enviar_midia" } }
        : "auto"

      if (deadlineAproximando(inicioProcessamento)) {
        textoRespostaForcado = montarFallbackDeadline(contextoContato)
        console.warn(
          "[Agente] Deadline antes de nova chamada OpenAI - usando fallback",
          {
            contatoId,
            conversaId,
            iteracoes,
          }
        )
        break
      }

      console.log("[Agente] Chamando OpenAI após tools", {
        contatoId,
        conversaId,
        iteracoes: iteracoes + 1,
      })
      resposta = await openai.chat.completions.create(
        {
          model: "gpt-4o",
          messages: mensagens,
          tools: ferramentasDaRodada,
          tool_choice: proximoToolChoice,
        },
        {
          timeout: timeoutOpenAI(inicioProcessamento),
        }
      )
      console.log("[Agente] OpenAI pós-tool respondeu", {
        contatoId,
        conversaId,
        toolCalls: resposta.choices[0]?.message?.tool_calls?.length ?? 0,
        temTexto: Boolean(resposta.choices[0]?.message?.content),
      })

      iteracoes++
    }

    let textoResposta =
      textoRespostaForcado ?? (resposta.choices[0]?.message?.content || "")

    // Se atingiu MAX_TOOL_ITERATIONS sem texto final, forca uma chamada SEM
    // tools pra obrigar GPT-4o a fechar com prosa. Antes desse fallback, o
    // paciente recebia silencio (return sem enviar nada) — pior UX possivel.
    const aindaPedindoTool = !!resposta.choices[0]?.message?.tool_calls?.length
    if (
      (!textoResposta || aindaPedindoTool) &&
      iteracoes >= MAX_TOOL_ITERATIONS
    ) {
      console.warn(
        `[Agente] Atingiu MAX_TOOL_ITERATIONS (${iteracoes}) sem fechar resposta — forcando fallback sem tools`
      )
      try {
        const fallback = await openai.chat.completions.create(
          {
            model: "gpt-4o",
            messages: mensagens,
            tool_choice: "none",
          },
          {
            timeout: timeoutOpenAI(inicioProcessamento),
          }
        )
        textoResposta = fallback.choices[0]?.message?.content || ""
      } catch (err) {
        console.error("[Agente] Fallback sem tools tambem falhou:", err)
      }
    }

    if (!textoResposta && enviouMidiaNestaRodada) {
      textoResposta = montarPerguntaQualificacaoFallback(contextoContato)
      console.warn(
        "[Agente] Midia enviada sem texto final - aplicando fallback de qualificacao"
      )
    }

    if (gerouOrcamentoNestaRodada && !orcamentoRespondidoAtual) {
      textoResposta = montarRespostaFotoQualificacaoCompleta(contextoContato)
    }

    if (
      textoResposta &&
      enviouMidiaNestaRodada &&
      contextoContato.etapa === "qualificacao" &&
      !assistentePediuDadoQualificacao(textoResposta)
    ) {
      textoResposta = `${textoResposta}\n---\n${montarPerguntaQualificacaoFallback(contextoContato)}`
      console.warn(
        "[Agente] Midia enviada sem pergunta de qualificacao - anexando continuidade"
      )
    }

    if (
      textoResposta &&
      orcamentoRespondidoAtual &&
      textoPrometeEnvioOrcamento(textoResposta)
    ) {
      textoResposta = montarRespostaAgendamentoAposOrcamento(
        contextoContato,
        orcamentoRespondidoAtual
      )
      console.warn(
        "[Agente] Resposta prometia novo orcamento, mas ja havia orcamento respondido - conduzindo para agendamento"
      )
    }

    if (
      textoResposta &&
      textoPrometeEnvioOrcamento(textoResposta) &&
      !orcamentoRespondidoAtual &&
      !gerouOrcamentoNestaRodada &&
      contatoId
    ) {
      try {
        const resultadoOrcamento = await executarFerramenta(
          "gerar_orcamento",
          {
            contatoId,
            conversaId,
            resumoCaso: montarResumoOrcamento(contextoContato, textoBuffer),
            prioridade: "normal",
          },
          baseUrl
        )
        const parsed = JSON.parse(resultadoOrcamento)
        if (parsed?.ok === true) {
          gerouOrcamentoNestaRodada = true
          enviarResultadosOrcamentoPendenteAposResposta = true
          textoResposta = montarRespostaFotoQualificacaoCompleta(contextoContato)
          console.warn(
            "[Agente] gerar_orcamento acionado por guarda anti-promessa"
          )
        } else {
          console.error(
            "[Agente] Guarda anti-promessa falhou ao gerar orçamento:",
            resultadoOrcamento
          )
          textoResposta = comVocativo(
            contextoContato,
            "Certo{nome}. Me manda um ok que eu sigo com seu orçamento por aqui."
          )
        }
      } catch (err) {
        console.error(
          "[Agente] Erro na guarda anti-promessa de orçamento:",
          err
        )
        textoResposta = comVocativo(
          contextoContato,
          "Certo{nome}. Me manda um ok que eu sigo com seu orçamento por aqui."
        )
      }
    }

    if (!textoResposta) {
      // Ultimo recurso — frase neutra que pede o paciente reformular sem
      // expor erro tecnico (regra absoluta #11 do system prompt).
      textoResposta = "Deu uma travadinha aqui, pode mandar de novo?"
      console.warn(
        "[Agente] Resposta vazia mesmo apos fallback — enviando frase neutra"
      )
    }

    enviouResposta = await enviarRespostaAgente({
      chatId,
      whatsapp,
      contatoId,
      conversaId,
      configWa: configEnvio,
      textoUsuario: textoBuffer,
      textoResposta,
    })

    if (enviouResposta && enviarResultadosOrcamentoPendenteAposResposta) {
      await enviarResultadosDuranteEsperaOrcamento()
    }
  } catch (error) {
    console.error("[Agente] Erro no loop de resposta:", error)
    if (!enviouResposta) {
      try {
        await enviarRespostaAgente({
          chatId,
          whatsapp,
          contatoId,
          conversaId,
          configWa: configEnvio,
          textoUsuario: textoBuffer,
          textoResposta: montarFallbackDeadline(contextoContato),
        })
      } catch (fallbackError) {
        console.error(
          "[Agente] Falha ao enviar fallback apos erro:",
          fallbackError
        )
      }
    }
  } finally {
    try {
      await enviarDigitando(
        configEnvio.uazapiUrl,
        configEnvio.instanceToken,
        chatId,
        false
      )
    } catch {
      console.warn("[Agente] Erro ao parar indicador de digitacao")
    }
  }

  // Retorna IDs pro route handler `/api/agente/processar`.
  if (!contatoId) return null
  return { contatoId, conversaId }
}
