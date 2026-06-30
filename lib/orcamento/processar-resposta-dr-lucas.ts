import { supabaseAdmin } from "@/lib/supabase"
import { agora } from "@/lib/db-utils"
import { enviarMensagem, enviarMidia } from "@/lib/uazapi"
import { gerarEHospedarOrcamento, formatarBrl } from "@/lib/orcamento/gerar"
import { adicionarAMemoria } from "@/lib/agente/memoria"
import { enviarResultadosProcedimento } from "@/lib/agente/enviar-resultados-procedimento"

/**
 * Ingestao da resposta do Dr. Lucas pelo WhatsApp pessoal dele.
 *
 * O Dr. Lucas responde `<numero> - <valor>` (ex.: "5511999998888 - 8500") pro
 * numero da clinica. O webhook detecta que o remetente e o
 * DR_LUCAS_WHATSAPP_PESSOAL e chama `processarRespostaDrLucas` ANTES de criar
 * qualquer contato. Aqui: parse -> casa cliente -> gera PDF -> envia -> retoma.
 *
 * Runtime: Node (o PDF usa @react-pdf/renderer). O webhook ja roda em Node.
 *
 * Toda a funcao e defensiva: nunca lanca — em qualquer falha loga e retorna um
 * resultado que o webhook usa so pra `continue` (a msg do Dr. Lucas nunca roda
 * o loop da IA nem cria contato).
 */

interface ConfigWa {
  uazapiUrl?: string | null
  instanceToken?: string | null
}

export interface ResultadoIngestao {
  /** Sempre true quando a msg veio do Dr. Lucas — o webhook deve `continue`. */
  tratado: boolean
}

/** So digitos. */
function soDigitos(s: string): string {
  return (s ?? "").replace(/\D+/g, "")
}

/**
 * Parse tolerante de `<numero> - <valor>`.
 *
 * Aceita:
 *  - "5511999998888 - 8500"
 *  - "5511999998888-8500"
 *  - "55 11 99999-8888 - R$ 8.500,00"  (separador e ` - ` com espacos)
 *  - "5511999998888 — 8.500" (travessao tambem)
 *
 * Estrategia: separa numero (esquerda) de valor (direita) pelo ULTIMO
 * separador hifen/travessao que tem digito-de-valor logo depois. O numero pode
 * conter hifens internos (formatacao de telefone), por isso pegamos o ultimo.
 */
export function parseNumeroValor(
  texto: string
): { numero: string; valor: number } | null {
  if (!texto) return null
  const limpo = texto.trim()

  // Casa: [qualquer coisa] <sep> [valor]. Valor = R$? digitos com . , opcionais.
  // Ancorado no fim pra ignorar lixo antes do numero.
  const m = limpo.match(
    /^(.*?)[\s]*[-–—][\s]*(?:R\$\s*)?([\d.,]+)\s*$/i
  )
  if (!m) {
    const telefoneMatch = limpo.match(
      /(?:\+?55[\s().-]*)?\(?\d{2}\)?[\s().-]*\d{4,5}[\s().-]*\d{4}/
    )
    if (!telefoneMatch) return null

    const numeroFallback = soDigitos(telefoneMatch[0])
    if (numeroFallback.length < 10 || numeroFallback.length > 13) return null

    const resto = limpo.slice((telefoneMatch.index ?? 0) + telefoneMatch[0].length)
    const valorMatch = resto.match(/(?:R\$\s*)?(\d[\d.,]*)/i)
    if (!valorMatch) return null

    const valorFallback = parseValorBrl(valorMatch[1])
    if (valorFallback == null || valorFallback <= 0) return null

    return { numero: numeroFallback, valor: valorFallback }
  }

  const numero = soDigitos(m[1])
  // Numero de telefone valido: pelo menos 10 digitos (DDD + numero), aceita
  // ate 13 (55 + DDD + 9 digitos). Evita casar lixo.
  if (numero.length < 10 || numero.length > 13) return null

  const valor = parseValorBrl(m[2])
  if (valor == null || valor <= 0) return null

  return { numero, valor }
}

/**
 * Converte string de valor BR pra numero.
 *  "8500" -> 8500
 *  "8.500" -> 8500
 *  "8.500,00" -> 8500
 *  "8500,50" -> 8500.5
 *  "8,500.00" (formato US, fallback) -> 8500
 */
export function parseValorBrl(raw: string): number | null {
  if (!raw) return null
  let s = raw.trim()

  const temVirgula = s.includes(",")
  const temPonto = s.includes(".")

  if (temVirgula && temPonto) {
    // Formato BR: ponto = milhar, virgula = decimal -> remove ponto, vira ponto a virgula
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (temVirgula) {
    // So virgula = decimal BR
    s = s.replace(",", ".")
  } else if (temPonto) {
    // So ponto. Heuristica: se tem exatamente 3 digitos depois do ultimo ponto,
    // e separador de milhar (ex: "8.500"). Senao e decimal (ex: "8500.50").
    const partes = s.split(".")
    const ultima = partes[partes.length - 1]
    if (partes.length > 1 && ultima.length === 3) {
      s = partes.join("")
    }
    // senao deixa como esta (ponto decimal)
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Resolve a config Uazapi ativa pra responder o Dr. Lucas / enviar a cliente.
 * O webhook ja carrega configWaBatch — passamos ela pra evitar query extra,
 * com fallback de busca caso venha vazia.
 */
async function obterConfig(configWa: ConfigWa | null): Promise<ConfigWa | null> {
  if (configWa?.uazapiUrl && configWa?.instanceToken) return configWa
  const { data } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .order("atualizadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

/** Avisa o Dr. Lucas (best-effort). */
async function avisarDrLucas(
  cfg: ConfigWa | null,
  numeroDrLucas: string,
  texto: string
): Promise<void> {
  try {
    if (cfg?.uazapiUrl && cfg?.instanceToken) {
      await enviarMensagem(cfg.uazapiUrl, cfg.instanceToken, numeroDrLucas, texto)
    }
  } catch (err) {
    console.error("[orcamento-dr-lucas] falha ao avisar Dr. Lucas:", err)
  }
}

/**
 * Ponto de entrada chamado pelo webhook. `textoMensagem` e o conteudo bruto da
 * mensagem do Dr. Lucas. `numeroDrLucas` e o DR_LUCAS_WHATSAPP_PESSOAL (so
 * digitos). Sempre retorna { tratado: true } (a msg do Dr. Lucas nunca vira
 * paciente), mesmo em falha.
 */
export async function processarRespostaDrLucas(args: {
  textoMensagem: string
  numeroDrLucas: string
  configWa: ConfigWa | null
}): Promise<ResultadoIngestao> {
  const { textoMensagem, numeroDrLucas } = args
  const cfg = await obterConfig(args.configWa)

  try {
    const parsed = parseNumeroValor(textoMensagem)

    if (!parsed) {
      await avisarDrLucas(
        cfg,
        numeroDrLucas,
        "Não entendi. Formato: numero - valor, ex: 5511999998888 - 8500"
      )
      return { tratado: true }
    }

    const { numero, valor } = parsed

    // Casa a cliente pelo numero. O webhook salva contatos.whatsapp como o
    // numero "puro" (so digitos do JID). Tentamos match exato e, como fallback,
    // por sufixo (Dr. Lucas pode mandar sem o 55, ou com 9 a mais/menos).
    const contato = await acharContatoPorNumero(numero)

    if (!contato) {
      await avisarDrLucas(
        cfg,
        numeroDrLucas,
        `Não encontrei nenhuma paciente com o número ${numero}. Confere o número e manda de novo no formato: numero - valor.`
      )
      return { tratado: true }
    }

    // Pendencia de orcamento aberta dela?
    const { data: pendencia } = await supabaseAdmin
      .from("eventos_orcamento_pendente")
      .select("id, conversaId, resumoCaso")
      .eq("contatoId", contato.id)
      .is("respondidoEm", null)
      .is("canceladoEm", null)
      .order("criadoEm", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!pendencia) {
      const nome = limparNome(contato.nome)
      await avisarDrLucas(
        cfg,
        numeroDrLucas,
        `${nome} nao tem nenhum orcamento em aberto agora. Gere um novo orcamento pela Ana Julia no atendimento atual e responda pela notificacao mais recente.`
      )
      return { tratado: true }
    }

    const nomePaciente = limparNome(contato.nome)
    const valorFormatado = formatarBrl(valor)

    // Dados do procedimento pro PDF (o que inclui + parcelamento).
    const proc = await resolverProcedimento(contato.procedimentoInteresse)

    // Gera + hospeda o PDF.
    const { url: pdfUrl, nomeArquivo } = await gerarEHospedarOrcamento({
      contatoId: contato.id,
      nomePaciente,
      procedimento: contato.procedimentoInteresse ?? proc?.nome ?? null,
      oQueInclui: proc?.escopoOferta || proc?.descricao || null,
      valor,
      parcelamento: proc?.parcelamento ?? null,
      resumoCaso: pendencia.resumoCaso,
      sobreOPaciente: contato.sobreOPaciente,
      procedimentoInteresse: contato.procedimentoInteresse,
    })

    // Mensagem curta no tom da Ana apresentando o orcamento.
    const apresentacao = `Prontinho, ${nomePaciente}! Falei com o Dr. Lucas e ele definiu seu orçamento em ${valorFormatado}. Segue o PDF com o que está incluso. Se fizer sentido pra você, posso ver os horários da reunião de diagnóstico online com ele?`

    // Envia o PDF como documento pra cliente.
    if (cfg?.uazapiUrl && cfg?.instanceToken) {
      await enviarMidia(
        cfg.uazapiUrl,
        cfg.instanceToken,
        contato.whatsapp,
        pdfUrl,
        "document",
        undefined,
        undefined,
        nomeArquivo
      )

      try {
        await enviarResultadosProcedimento({
          contatoId: contato.id,
          conversaId: pendencia.conversaId,
          whatsapp: contato.whatsapp,
          configWa: cfg,
          procedimentoInteresse: contato.procedimentoInteresse ?? proc?.nome ?? null,
          origem: "orcamento_exato",
          chatId: `${contato.whatsapp}@s.whatsapp.net`,
        })
      } catch (err) {
        console.error(
          "[orcamento-dr-lucas] falha best-effort ao enviar resultados:",
          err
        )
      }

      await enviarMensagem(
        cfg.uazapiUrl,
        cfg.instanceToken,
        contato.whatsapp,
        apresentacao
      )

      // Registra a mensagem da Ana no historico do contato (best-effort).
      try {
        await registrarMensagemAna(contato.id, pendencia.conversaId, apresentacao)
      } catch (err) {
        console.error("[orcamento-dr-lucas] falha ao registrar msg da Ana:", err)
      }
    } else {
      console.error(
        "[orcamento-dr-lucas] config_whatsapp ausente — PDF gerado mas nao enviado"
      )
    }

    const notaOrcamento = montarNotaOrcamento(valorFormatado, pdfUrl)
    const sobreOPacienteAtualizado = anexarNotaContato(
      contato.sobreOPaciente,
      notaOrcamento
    )

    // Marca pendencia respondida (guarda o valor em `observacoes` pra auditoria)
    // e retoma o atendimento da cliente.
    await Promise.all([
      supabaseAdmin
        .from("eventos_orcamento_pendente")
        .update({
          respondidoEm: agora(),
          observacoes: `Valor informado pelo Dr. Lucas: ${valorFormatado}. PDF: ${pdfUrl}`,
        })
        .eq("id", pendencia.id),
      supabaseAdmin
        .from("contatos")
        .update({
          aguardandoOrcamentoHumano: false,
          aguardandoOrcamentoDesde: null,
          sobreOPaciente: sobreOPacienteAtualizado,
          atualizadoEm: agora(),
        })
        .eq("id", contato.id),
    ])

    await registrarOrcamentoNaMemoria({
      chatId: `${contato.whatsapp}@s.whatsapp.net`,
      valorFormatado,
      pdfUrl,
      apresentacao,
    })

    // Confirma pro Dr. Lucas.
    await avisarDrLucas(
      cfg,
      numeroDrLucas,
      `Orçamento de ${valorFormatado} enviado pra ${nomePaciente}.`
    )

    return { tratado: true }
  } catch (err) {
    console.error("[orcamento-dr-lucas] erro inesperado:", err)
    // Mesmo em erro, avisa o Dr. Lucas pra ele nao ficar no escuro.
    await avisarDrLucas(
      cfg,
      numeroDrLucas,
      "Tive um problema pra gerar esse orçamento. Pode tentar mandar de novo no formato: numero - valor."
    )
    return { tratado: true }
  }
}

interface ContatoMin {
  id: string
  nome: string | null
  whatsapp: string
  procedimentoInteresse: string | null
  sobreOPaciente: string | null
}

/** Acha a cliente pelo numero (match exato; fallback por sufixo de 8 digitos). */
async function acharContatoPorNumero(
  numero: string
): Promise<ContatoMin | null> {
  // 1. Match exato.
  const { data: exato } = await supabaseAdmin
    .from("contatos")
    .select("id, nome, whatsapp, procedimentoInteresse, sobreOPaciente")
    .eq("whatsapp", numero)
    .is("deletadoEm", null)
    .maybeSingle()
  if (exato) return exato as ContatoMin

  // 2. Fallback por sufixo (Dr. Lucas pode mandar com/sem 55 ou 9 extra).
  // Compara os ultimos 8 digitos (numero local sem DDD/9), que sao estaveis.
  const sufixo = numero.slice(-8)
  if (sufixo.length < 8) return null
  const { data: candidatos } = await supabaseAdmin
    .from("contatos")
    .select("id, nome, whatsapp, procedimentoInteresse, sobreOPaciente")
    .ilike("whatsapp", `%${sufixo}`)
    .is("deletadoEm", null)
    .limit(2)

  // So aceita se houver UM unico candidato (evita casar a paciente errada).
  if (candidatos && candidatos.length === 1) {
    return candidatos[0] as ContatoMin
  }
  return null
}

interface ProcedimentoMin {
  nome: string
  descricao: string | null
  escopoOferta: string | null
  parcelamento: string | null
}

/** Resolve o procedimento pelo texto de interesse (ilike). Best-effort. */
async function resolverProcedimento(
  interesse: string | null
): Promise<ProcedimentoMin | null> {
  const termo = interesse?.trim()
  if (!termo) return null

  const buscar = async (busca: string) => {
    const { data } = await supabaseAdmin
      .from("procedimentos")
      .select("nome, descricao, escopoOferta, parcelamento")
      .ilike("nome", `%${busca}%`)
      .eq("ativo", true)
      .is("deletadoEm", null)
      .limit(1)
      .maybeSingle()
    return (data as unknown as ProcedimentoMin) ?? null
  }

  const direto = await buscar(termo)
  if (direto) return direto

  const normalizado = termo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  const fallback =
    normalizado.includes("mini lipo") || normalizado.includes("minilipo")
      ? "mini lipo"
      : normalizado.includes("lipo")
        ? "lipo"
        : null

  if (fallback) return buscar(fallback)

  const partesBusca = termo
    .split(/\s+/)
    .filter((parte) => parte.length >= 4)
    .slice(0, 3)
  if (partesBusca.length === 0) return null

  const { data } = await supabaseAdmin
    .from("procedimentos")
    .select("nome, descricao, escopoOferta, parcelamento")
    .or(partesBusca.map((parte) => `nome.ilike.%${parte}%`).join(","))
    .eq("ativo", true)
    .is("deletadoEm", null)
    .limit(1)
    .maybeSingle()
  return (data as unknown as ProcedimentoMin) ?? null
}

/** Remove o prefixo "WhatsApp " de nomes genericos. */
function limparNome(nome: string | null): string {
  return (nome ?? "").replace(/^WhatsApp\s+/, "").trim() || "tudo certo"
}

function formatarAgoraBR(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())
}

function montarNotaOrcamento(valorFormatado: string, pdfUrl: string): string {
  return `Orcamento enviado ao paciente: ${valorFormatado} em ${formatarAgoraBR()}. PDF: ${pdfUrl}`
}

function anexarNotaContato(
  sobreOPaciente: string | null,
  notaOrcamento: string
): string {
  const atual = sobreOPaciente?.trim()
  if (atual?.includes(notaOrcamento)) return atual
  return [atual, notaOrcamento].filter(Boolean).join("\n---\n")
}

async function registrarOrcamentoNaMemoria(params: {
  chatId: string
  valorFormatado: string
  pdfUrl: string
  apresentacao: string
}): Promise<void> {
  const { chatId, valorFormatado, pdfUrl, apresentacao } = params

  try {
    await adicionarAMemoria(chatId, {
      role: "system",
      content: `Orcamento do Dr. Lucas ja foi enviado ao paciente no valor de ${valorFormatado}. PDF: ${pdfUrl}. Se o paciente aprovar, avance para agendamento. Nao gere novo orcamento neste ciclo.`,
    })
    await adicionarAMemoria(chatId, {
      role: "assistant",
      content: apresentacao,
    })
  } catch (err) {
    console.error("[orcamento-dr-lucas] falha ao registrar memoria:", err)
  }
}

/** Registra a mensagem da Ana no historico (best-effort). */
async function registrarMensagemAna(
  contatoId: string,
  conversaId: string | null,
  conteudo: string
): Promise<void> {
  let convId = conversaId
  if (!convId) {
    const { data: conv } = await supabaseAdmin
      .from("conversas")
      .select("id")
      .eq("contatoId", contatoId)
      .order("criadoEm", { ascending: false })
      .limit(1)
      .maybeSingle()
    convId = conv?.id ?? null
  }
  if (!convId) return

  const { criarId } = await import("@/lib/db-utils")
  // messageIdWhatsapp e NOT NULL + UNIQUE. Como essa msg nao veio do WhatsApp
  // (foi gerada internamente apos o PDF), usamos um id sintetico unico.
  await supabaseAdmin.from("mensagens_whatsapp").insert({
    id: criarId(),
    conversaId: convId,
    contatoId,
    messageIdWhatsapp: `orcamento-${criarId()}`,
    tipo: "texto",
    conteudo,
    remetente: "agente",
  })
}
