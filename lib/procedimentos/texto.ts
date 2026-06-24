const CAMPOS_MARKDOWN_LISTA = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/gm
const CABECALHOS_MARKDOWN = /^\s{0,3}#{1,6}\s+/gm
const LINKS_MARKDOWN = /\[([^\]]+)\]\(([^)]+)\)/g
const COLCHETES_SOLTOS = /\[([^\]]+)\]/g

export function normalizarTextoProcedimento(valor: string | null | undefined) {
  if (valor == null) return valor

  return valor
    .replace(/\r\n/g, "\n")
    .replace(CABECALHOS_MARKDOWN, "")
    .replace(LINKS_MARKDOWN, "$1")
    .replace(COLCHETES_SOLTOS, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(CAMPOS_MARKDOWN_LISTA, "")
    .replace(/`{1,3}/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
