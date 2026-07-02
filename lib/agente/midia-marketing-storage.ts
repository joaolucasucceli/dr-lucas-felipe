import { supabaseAdmin } from "@/lib/supabase"

export const BUCKET_MIDIAS_MARKETING = "atendimento-midias"

const PASTA_MIDIAS_MARKETING = "midia-marketing"
const PASTA_RESULTADOS_PUBLICOS = "/images/resultados/"

function ehAssetPublicoResultados(url: string): boolean {
  const valor = url.trim()
  if (!valor) return false

  const semQuery = valor.split("?")[0]
  if (semQuery.startsWith(PASTA_RESULTADOS_PUBLICOS)) return true

  try {
    const parsed = new URL(valor)
    const hostAtual = process.env.NEXTAUTH_URL
      ? new URL(process.env.NEXTAUTH_URL).host
      : null
    const hostsPermitidos = new Set(
      [hostAtual, "dr-lucas-central.vercel.app"].filter(Boolean)
    )

    return (
      parsed.pathname.startsWith(PASTA_RESULTADOS_PUBLICOS) &&
      hostsPermitidos.has(parsed.host)
    )
  } catch {
    return false
  }
}

export function extrairPathMidiaMarketing(url: string): string | null {
  const valor = url.trim()
  if (!valor) return null

  const semQuery = valor.split("?")[0]
  const pathDireto = semQuery.replace(/^\/+/, "")
  if (pathDireto.startsWith(`${PASTA_MIDIAS_MARKETING}/`)) {
    return pathDireto
  }

  try {
    const parsed = new URL(valor)
    const pathname = decodeURIComponent(parsed.pathname)
    const markers = [
      `/storage/v1/object/public/${BUCKET_MIDIAS_MARKETING}/`,
      `/storage/v1/object/${BUCKET_MIDIAS_MARKETING}/`,
      `/${BUCKET_MIDIAS_MARKETING}/`,
    ]

    for (const marker of markers) {
      const idx = pathname.indexOf(marker)
      if (idx !== -1) return pathname.substring(idx + marker.length)
    }
  } catch {
    const marker = `${BUCKET_MIDIAS_MARKETING}/`
    const idx = pathDireto.indexOf(marker)
    if (idx !== -1) return pathDireto.substring(idx + marker.length)
  }

  return null
}

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
