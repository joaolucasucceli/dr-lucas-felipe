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

export async function midiaMarketingExisteNoStorage(url: string): Promise<boolean> {
  if (ehAssetPublicoResultados(url)) return true

  const path = extrairPathMidiaMarketing(url)
  if (!path) {
    console.warn("[midia-marketing-storage] URL sem path de Storage reconhecido:", url)
    return false
  }

  const ultimoSeparador = path.lastIndexOf("/")
  const pasta = ultimoSeparador === -1 ? "" : path.substring(0, ultimoSeparador)
  const nomeArquivo = ultimoSeparador === -1 ? path : path.substring(ultimoSeparador + 1)

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_MIDIAS_MARKETING)
    .list(pasta, { limit: 100, search: nomeArquivo })

  if (error) {
    console.warn("[midia-marketing-storage] Falha ao verificar Storage:", error.message)
    return true
  }

  return (data ?? []).some((arquivo) => arquivo.name === nomeArquivo)
}

export async function filtrarMidiasComArquivo<T extends { id: string; url: string }>(
  midias: T[],
  contexto: string
): Promise<T[]> {
  const verificadas = await Promise.all(
    midias.map(async (midia) => ({
      midia,
      existe: await midiaMarketingExisteNoStorage(midia.url),
    }))
  )

  const removidas = verificadas.filter((item) => !item.existe).map((item) => item.midia)
  if (removidas.length > 0) {
    console.warn(
      `[midia-marketing-storage] ${removidas.length} midia(s) ignorada(s) sem arquivo no Storage (${contexto}):`,
      removidas.map((midia) => midia.id)
    )
  }

  return verificadas.filter((item) => item.existe).map((item) => item.midia)
}
