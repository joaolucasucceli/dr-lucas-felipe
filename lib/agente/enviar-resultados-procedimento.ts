import { adicionarAMemoria } from "@/lib/agente/memoria"
import {
  type ConfigWhatsappEnvio,
  enviarMidiaMarketing,
  type MidiaMarketingEnvio,
  resolverConversaAtiva,
} from "@/lib/agente/enviar-midia-marketing"
import { filtrarMidiasComArquivo } from "@/lib/agente/midia-marketing-storage"
import { supabaseAdmin } from "@/lib/supabase"

type OrigemResultadosProcedimento =
  | "orcamento_estimado"
  | "orcamento_exato_pendente"

type MidiaSelecionada = {
  midia: MidiaMarketingEnvio
  jaEnviada: boolean
}

type MotivoSemEnvio =
  | "sem_midias_ativas"
  | "sem_midias_compativeis"
  | "midias_compativeis_sem_arquivo"
  | "todas_midias_ja_enviadas"
  | "erro_busca_midias"
  | "falha_envio_midia"

type DiagnosticoResultados = {
  motivo?: MotivoSemEnvio
  totalAtivas: number
  totalCompativeis: number
  totalNovas: number
  totalNovasComArquivo: number
  totalJaEnviadas: number
  totalJaEnviadasComArquivo: number
}

type SelecaoResultados = {
  selecionadas: MidiaSelecionada[]
  diagnostico: DiagnosticoResultados
}

function normalizar(texto: string | null | undefined): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
}

function contextoEhLipo(texto: string): boolean {
  return /\b(mini\s*lipo|minilipo|lipo|lipoaspiracao|abdomen|abdome|flancos?)\b/.test(texto)
}

function descricaoEhOutroProcedimento(descricao: string, contexto: string): boolean {
  if (!contextoEhLipo(contexto)) return false

  const falaDeLipo =
    /\b(mini\s*lipo|minilipo|lipo|lipoaspiracao|abdomen|abdome|flancos?)\b/.test(
      descricao
    )
  const falaDeGluteo =
    /\b(gluteo|gluteos|glutea|pmma|preenchimento)\b/.test(descricao)

  return falaDeGluteo && !falaDeLipo
}

function termosDeBusca(procedimentoInteresse?: string | null): string[] {
  const contexto = normalizar(procedimentoInteresse)
  const termos = new Set<string>()

  for (const parte of contexto.split(/\s+/)) {
    if (parte.length >= 4) termos.add(parte)
  }

  if (contextoEhLipo(contexto)) {
    for (const termo of [
      "mini lipo",
      "minilipo",
      "lipo",
      "lipoaspiracao",
      "abdomen",
      "abdome",
      "flancos",
      "resultado",
    ]) {
      termos.add(termo)
    }
  }

  if (termos.size === 0) termos.add("resultado")
  return [...termos]
}

function pontuarMidia(midia: MidiaMarketingEnvio, termos: string[]): number {
  const descricao = normalizar(midia.descricao)
  let score = 0

  for (const termo of termos) {
    if (descricao.includes(termo)) score += termo.includes(" ") ? 3 : 2
  }

  if (descricao.includes("resultado")) score += 1
  if (descricao.includes("abdomen") || descricao.includes("abdome")) score += 2
  if (descricao.includes("flanco")) score += 1
  if (descricao.includes("lipo")) score += 3

  return score
}

async function obterUrlsJaEnviadas(conversaId: string | null): Promise<Set<string>> {
  if (!conversaId) return new Set()

  const { data } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .select("mediaUrl")
    .eq("conversaId", conversaId)
    .eq("remetente", "agente")
    .not("mediaUrl", "is", null)

  const urls = new Set<string>()
  for (const item of data ?? []) {
    if (!item.mediaUrl) continue
    for (const chave of chavesUrl(item.mediaUrl)) {
      urls.add(chave)
    }
  }

  return urls
}

function chavesUrl(url: string): string[] {
  const chaves = new Set<string>([url])
  try {
    const parsed = new URL(url)
    chaves.add(parsed.pathname)
    chaves.add(parsed.pathname.replace(/^\/+/, ""))
  } catch {
    chaves.add(url.replace(/^\/+/, ""))
  }

  return [...chaves]
}

function urlJaEnviada(url: string, urlsJaEnviadas: Set<string>): boolean {
  return chavesUrl(url).some((chave) => urlsJaEnviadas.has(chave))
}

async function selecionarResultados(params: {
  conversaId: string | null
  procedimentoInteresse?: string | null
  limite: number
  permitirReenvioJaEnviadas: boolean
}): Promise<SelecaoResultados> {
  const {
    conversaId,
    procedimentoInteresse,
    limite,
    permitirReenvioJaEnviadas,
  } = params
  const contexto = normalizar(procedimentoInteresse)
  const termos = termosDeBusca(procedimentoInteresse)
  const urlsJaEnviadas = await obterUrlsJaEnviadas(conversaId)

  const { data, error } = await supabaseAdmin
    .from("midia_marketing")
    .select("id, descricao, url")
    .is("deletadoEm", null)
    .order("criadoEm", { ascending: false })

  if (error) {
    console.error("[resultados-procedimento] Falha ao buscar midias:", error.message)
    return {
      selecionadas: [],
      diagnostico: {
        motivo: "erro_busca_midias",
        totalAtivas: 0,
        totalCompativeis: 0,
        totalNovas: 0,
        totalNovasComArquivo: 0,
        totalJaEnviadas: 0,
        totalJaEnviadasComArquivo: 0,
      },
    }
  }

  const totalAtivas = data?.length ?? 0
  const candidatasPontuadas = ((data ?? []) as MidiaMarketingEnvio[])
    .filter((midia) => !descricaoEhOutroProcedimento(normalizar(midia.descricao), contexto))
    .map((midia) => ({
      midia,
      score: pontuarMidia(midia, termos),
      jaEnviada: urlJaEnviada(midia.url, urlsJaEnviadas),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const novas = candidatasPontuadas
    .filter((item) => !item.jaEnviada)
    .map((item) => item.midia)
  const novasComArquivo = await filtrarMidiasComArquivo(
    novas,
    `resultados procedimento="${procedimentoInteresse || ""}"`
  )

  const selecionadas: MidiaSelecionada[] = novasComArquivo
    .slice(0, limite)
    .map((midia) => ({ midia, jaEnviada: false }))

  const jaEnviadas = candidatasPontuadas
    .filter((item) => item.jaEnviada)
    .map((item) => item.midia)
  let jaEnviadasComArquivo: MidiaMarketingEnvio[] = []

  if (!permitirReenvioJaEnviadas || selecionadas.length >= limite) {
    return {
      selecionadas,
      diagnostico: {
        motivo: motivoSemSelecao({
          selecionadas: selecionadas.length,
          totalAtivas,
          totalCompativeis: candidatasPontuadas.length,
          totalNovas: novas.length,
          totalNovasComArquivo: novasComArquivo.length,
          totalJaEnviadas: jaEnviadas.length,
          totalJaEnviadasComArquivo: 0,
          permitirReenvioJaEnviadas,
        }),
        totalAtivas,
        totalCompativeis: candidatasPontuadas.length,
        totalNovas: novas.length,
        totalNovasComArquivo: novasComArquivo.length,
        totalJaEnviadas: jaEnviadas.length,
        totalJaEnviadasComArquivo: 0,
      },
    }
  }

  jaEnviadasComArquivo = await filtrarMidiasComArquivo(
    jaEnviadas,
    `resultados procedimento="${procedimentoInteresse || ""}" reenvio`
  )

  const selecionadasComReenvio = [
    ...selecionadas,
    ...jaEnviadasComArquivo
      .slice(0, limite - selecionadas.length)
      .map((midia) => ({ midia, jaEnviada: true })),
  ]

  return {
    selecionadas: selecionadasComReenvio,
    diagnostico: {
      motivo: motivoSemSelecao({
        selecionadas: selecionadasComReenvio.length,
        totalAtivas,
        totalCompativeis: candidatasPontuadas.length,
        totalNovas: novas.length,
        totalNovasComArquivo: novasComArquivo.length,
        totalJaEnviadas: jaEnviadas.length,
        totalJaEnviadasComArquivo: jaEnviadasComArquivo.length,
        permitirReenvioJaEnviadas,
      }),
      totalAtivas,
      totalCompativeis: candidatasPontuadas.length,
      totalNovas: novas.length,
      totalNovasComArquivo: novasComArquivo.length,
      totalJaEnviadas: jaEnviadas.length,
      totalJaEnviadasComArquivo: jaEnviadasComArquivo.length,
    },
  }
}

function motivoSemSelecao(params: {
  selecionadas: number
  totalAtivas: number
  totalCompativeis: number
  totalNovas: number
  totalNovasComArquivo: number
  totalJaEnviadas: number
  totalJaEnviadasComArquivo: number
  permitirReenvioJaEnviadas: boolean
}): MotivoSemEnvio | undefined {
  if (params.selecionadas > 0) return undefined
  if (params.totalAtivas === 0) return "sem_midias_ativas"
  if (params.totalCompativeis === 0) return "sem_midias_compativeis"
  if (params.totalNovas > 0 && params.totalNovasComArquivo === 0) {
    return "midias_compativeis_sem_arquivo"
  }
  if (
    !params.permitirReenvioJaEnviadas &&
    params.totalNovas === 0 &&
    params.totalJaEnviadas > 0
  ) {
    return "todas_midias_ja_enviadas"
  }
  if (
    params.permitirReenvioJaEnviadas &&
    params.totalJaEnviadas > 0 &&
    params.totalJaEnviadasComArquivo === 0
  ) {
    return "midias_compativeis_sem_arquivo"
  }
  return "sem_midias_compativeis"
}

export async function enviarResultadosProcedimento(params: {
  contatoId: string
  conversaId?: string | null
  whatsapp: string
  configWa: ConfigWhatsappEnvio | null
  procedimentoInteresse?: string | null
  limite?: number
  baseUrl?: string | null
  origem: OrigemResultadosProcedimento
  chatId?: string | null
}): Promise<{
  enviadas: number
  ignoradas: number
  midiaIds: string[]
  motivo?: MotivoSemEnvio
  diagnostico: DiagnosticoResultados
}> {
  const conversaId = await resolverConversaAtiva(params.contatoId, params.conversaId)
  const limite = params.limite ?? 3
  const { selecionadas, diagnostico } = await selecionarResultados({
    conversaId,
    procedimentoInteresse: params.procedimentoInteresse,
    limite,
    permitirReenvioJaEnviadas: params.origem === "orcamento_exato_pendente",
  })

  let enviadas = 0
  let ignoradas = 0
  let reaproveitadas = 0
  const midiaIds: string[] = []

  for (const item of selecionadas) {
    const resultado = await enviarMidiaMarketing({
      contatoId: params.contatoId,
      conversaId,
      whatsapp: params.whatsapp,
      configWa: params.configWa,
      midia: item.midia,
      baseUrl: params.baseUrl,
      contextoLog: params.origem,
    })

    if (resultado.enviado) {
      enviadas++
      if (item.jaEnviada) reaproveitadas++
      midiaIds.push(item.midia.id)
    } else {
      ignoradas++
    }
  }

  console.log("[resultados-procedimento] envio concluido", {
    contatoId: params.contatoId,
    conversaId,
    origem: params.origem,
    procedimentoInteresse: params.procedimentoInteresse,
    enviadas,
    ignoradas,
    reaproveitadas,
    motivo: enviadas === 0 ? diagnostico.motivo : undefined,
    diagnostico,
    midiaIds,
  })

  const motivo = enviadas === 0 && ignoradas > 0 ? "falha_envio_midia" : diagnostico.motivo

  if (params.chatId && enviadas > 0) {
    await adicionarAMemoria(params.chatId, {
      role: "system",
      content: `Foram enviados ${enviadas} resultado(s) visual(is) relacionado(s) ao procedimento ${
        params.origem === "orcamento_estimado"
          ? "junto do orcamento estimado"
          : "enquanto o paciente aguarda o orcamento exato"
      }. Nao diga que faltou enviar imagens.`,
    })
  }

  return {
    enviadas,
    ignoradas,
    midiaIds,
    motivo,
    diagnostico: { ...diagnostico, motivo },
  }
}
