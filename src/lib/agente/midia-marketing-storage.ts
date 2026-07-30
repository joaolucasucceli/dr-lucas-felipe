import { supabaseAdmin } from "@/lib/supabase"
import {
  BUCKET_MIDIAS_MARKETING,
  ehAssetPublicoResultados,
  extrairPathMidiaMarketing,
} from "@/lib/agente/midia-marketing-url"

// A leitura de URL é pura e mora em `midia-marketing-url.ts`, para o cadastro
// poder aplicar a mesma regra sem arrastar o client do Supabase para o
// navegador. Reexportado porque este é o módulo que os consumidores já
// conheciam — não há duas verdades, só duas portas para a mesma.
export {
  BUCKET_MIDIAS_MARKETING,
  extrairPathMidiaMarketing,
} from "@/lib/agente/midia-marketing-url"

/** Quantos arquivos por pasta cabem numa listagem. Ver o fail-open abaixo. */
const LIMITE_LISTAGEM = 1000

function separarPasta(path: string): { pasta: string; nomeArquivo: string } {
  const ultimoSeparador = path.lastIndexOf("/")
  return ultimoSeparador === -1
    ? { pasta: "", nomeArquivo: path }
    : {
        pasta: path.substring(0, ultimoSeparador),
        nomeArquivo: path.substring(ultimoSeparador + 1),
      }
}

/**
 * O arquivo de cada URL existe? Responde para várias de uma vez.
 *
 * **Uma listagem por PASTA, não uma consulta por mídia.** Medido em 30/07/2026
 * com o acervo real: 17 consultas em paralelo custam ~160ms (450ms a frio),
 * enquanto listar a pasta inteira custa 60ms e responde por todas. A diferença
 * não aperta hoje, mas o formato importa — o painel chama isto a cada abertura
 * e o agente dentro de um processamento que tem 45s de teto.
 *
 * Esta é a implementação ÚNICA da regra; `midiaMarketingExisteNoStorage` é uma
 * casca em cima dela, para não existirem duas respostas para a mesma pergunta.
 */
export async function verificarArquivosNoStorage(
  urls: string[]
): Promise<Map<string, boolean>> {
  const resultado = new Map<string, boolean>()
  const porPasta = new Map<string, { url: string; nomeArquivo: string }[]>()

  for (const url of urls) {
    if (resultado.has(url)) continue

    if (ehAssetPublicoResultados(url)) {
      resultado.set(url, true)
      continue
    }

    const path = extrairPathMidiaMarketing(url)
    if (!path) {
      console.warn("[midia-marketing-storage] URL sem path de Storage reconhecido:", url)
      resultado.set(url, false)
      continue
    }

    const { pasta, nomeArquivo } = separarPasta(path)
    const lista = porPasta.get(pasta) ?? []
    lista.push({ url, nomeArquivo })
    porPasta.set(pasta, lista)
  }

  await Promise.all(
    [...porPasta.entries()].map(async ([pasta, itens]) => {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_MIDIAS_MARKETING)
        .list(pasta, { limit: LIMITE_LISTAGEM })

      // Fail-open em duas situações, pelo mesmo motivo: dizer "arquivo não
      // encontrado" para arquivo que existe é o pior erro possível aqui — some
      // a mídia do envio e ainda acende alarme falso no painel.
      //
      // (1) erro na listagem; (2) listagem cheia até o limite, quando a
      // ausência deixa de ser prova (o arquivo pode estar na página seguinte).
      if (error) {
        console.warn("[midia-marketing-storage] Falha ao verificar Storage:", error.message)
        for (const item of itens) resultado.set(item.url, true)
        return
      }

      const arquivos = data ?? []
      if (arquivos.length >= LIMITE_LISTAGEM) {
        console.warn(
          `[midia-marketing-storage] Pasta "${pasta}" atingiu o limite de listagem — assumindo que os arquivos existem`
        )
        for (const item of itens) resultado.set(item.url, true)
        return
      }

      const nomes = new Set(arquivos.map((arquivo) => arquivo.name))
      for (const item of itens) resultado.set(item.url, nomes.has(item.nomeArquivo))
    })
  )

  return resultado
}

export async function midiaMarketingExisteNoStorage(url: string): Promise<boolean> {
  const mapa = await verificarArquivosNoStorage([url])
  return mapa.get(url) ?? true
}

export async function filtrarMidiasComArquivo<T extends { id: string; url: string }>(
  midias: T[],
  contexto: string
): Promise<T[]> {
  const mapa = await verificarArquivosNoStorage(midias.map((midia) => midia.url))
  const verificadas = midias.map((midia) => ({
    midia,
    existe: mapa.get(midia.url) ?? true,
  }))

  const removidas = verificadas.filter((item) => !item.existe).map((item) => item.midia)
  if (removidas.length > 0) {
    console.warn(
      `[midia-marketing-storage] ${removidas.length} midia(s) ignorada(s) sem arquivo no Storage (${contexto}):`,
      removidas.map((midia) => midia.id)
    )
  }

  return verificadas.filter((item) => item.existe).map((item) => item.midia)
}
