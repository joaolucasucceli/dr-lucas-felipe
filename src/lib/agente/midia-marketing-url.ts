/**
 * O que o sistema sabe ler de URL de mídia — a parte PURA, sem Supabase.
 *
 * Estas funções moravam em `midia-marketing-storage.ts`, que importa
 * `supabaseAdmin` no topo. Isso as tornava inutilizáveis no cadastro: importar
 * lá do formulário arrastaria o client de servidor para o bundle do navegador.
 * O resultado prático era que **nada validava a URL na hora de cadastrar** —
 * uma mídia com endereço que o sistema não sabe ler entrava no catálogo, ficava
 * verde na tela, e só sumia na hora de enviar, em silêncio (OPE-559).
 *
 * Separando o puro do que fala com o banco, a mesma regra passa a valer nas
 * duas pontas: barra no cadastro e continua barrando no envio.
 */

export const BUCKET_MIDIAS_MARKETING = "atendimento-midias"

const PASTA_MIDIAS_MARKETING = "midia-marketing"
const PASTA_RESULTADOS_PUBLICOS = "/images/resultados/"

/**
 * Asset servido pelo próprio site, em `public/images/resultados/`.
 *
 * A lista de hosts é fixa porque a checagem roda no servidor, onde só existem
 * esses dois. Em preview da Vercel o host é outro e a URL absoluta cai fora —
 * por isso o cadastro deve preferir caminho relativo (`/images/resultados/x`),
 * que passa em qualquer ambiente.
 */
export function ehAssetPublicoResultados(url: string): boolean {
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

/** Caminho dentro do bucket, ou `null` quando a URL não é reconhecida. */
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

/**
 * O sistema consegue localizar o arquivo desta URL?
 *
 * `false` aqui significa que a mídia **nunca** seria enviada, por mais que o
 * arquivo exista de fato em algum lugar. É a condição que vale barrar no
 * cadastro: melhor recusar na hora do que aceitar e sumir depois.
 */
export function urlDeMidiaSuportada(url: string): boolean {
  return ehAssetPublicoResultados(url) || extrairPathMidiaMarketing(url) !== null
}
