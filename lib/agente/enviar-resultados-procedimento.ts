import { adicionarAMemoria } from "@/lib/agente/memoria"
import {
  type ConfigWhatsappEnvio,
  enviarMidiaMarketing,
  type MidiaMarketingEnvio,
  resolverConversaAtiva,
} from "@/lib/agente/enviar-midia-marketing"
import { filtrarMidiasComArquivo } from "@/lib/agente/midia-marketing-storage"
import { supabaseAdmin } from "@/lib/supabase"

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
}): Promise<MidiaMarketingEnvio[]> {
  const { conversaId, procedimentoInteresse, limite } = params
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
    return []
  }

  const candidatas = ((data ?? []) as MidiaMarketingEnvio[])
    .filter((midia) => !urlJaEnviada(midia.url, urlsJaEnviadas))
    .filter((midia) => !descricaoEhOutroProcedimento(normalizar(midia.descricao), contexto))
    .map((midia) => ({ midia, score: pontuarMidia(midia, termos) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.midia)

  const comArquivo = await filtrarMidiasComArquivo(
    candidatas,
    `resultados procedimento="${procedimentoInteresse || ""}"`
  )

  return comArquivo.slice(0, limite)
}

export async function enviarResultadosProcedimento(params: {
  contatoId: string
  conversaId?: string | null
  whatsapp: string
  configWa: ConfigWhatsappEnvio | null
  procedimentoInteresse?: string | null
  limite?: number
  baseUrl?: string | null
  origem: "orcamento_estimado" | "orcamento_exato"
  chatId?: string | null
}): Promise<{
  enviadas: number
  ignoradas: number
  midiaIds: string[]
}> {
  const conversaId = await resolverConversaAtiva(params.contatoId, params.conversaId)
  const limite = params.limite ?? 3
  const selecionadas = await selecionarResultados({
    conversaId,
    procedimentoInteresse: params.procedimentoInteresse,
    limite,
  })

  let enviadas = 0
  let ignoradas = 0
  const midiaIds: string[] = []

  for (const midia of selecionadas) {
    const resultado = await enviarMidiaMarketing({
      contatoId: params.contatoId,
      conversaId,
      whatsapp: params.whatsapp,
      configWa: params.configWa,
      midia,
      baseUrl: params.baseUrl,
      contextoLog: params.origem,
    })

    if (resultado.enviado) {
      enviadas++
      midiaIds.push(midia.id)
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
    midiaIds,
  })

  if (params.chatId && enviadas > 0) {
    await adicionarAMemoria(params.chatId, {
      role: "system",
      content: `Foram enviados ${enviadas} resultado(s) visual(is) relacionado(s) ao procedimento junto do ${params.origem === "orcamento_estimado" ? "orcamento estimado" : "orcamento exato"}. Nao diga que faltou enviar imagens.`,
    })
  }

  return { enviadas, ignoradas, midiaIds }
}
