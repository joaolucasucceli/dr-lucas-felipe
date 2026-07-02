import { renderToBuffer } from "@react-pdf/renderer"
import { supabaseAdmin } from "@/lib/supabase"
import { getBaseUrl } from "@/lib/env"
import { OrcamentoPDF, type DadosOrcamento } from "@/lib/orcamento/pdf"

/**
 * Geracao + storage do PDF de orcamento.
 *
 * Runtime: Node (nao edge) — quem importa este modulo precisa rodar com
 * `export const runtime = "nodejs"`.
 */

const BUCKET = "atendimento-midias"
const VALIDADE_PADRAO_DIAS = 7

/** Foto do Dr. Lucas usada no cabecalho do PDF (URL absoluta). */
export function urlFotoDrLucas(): string {
  return `${getBaseUrl()}/images/dr-lucas/foto-1.jpeg`
}

/** Formata um valor numerico em BRL: 8500 -> "R$ 8.500,00". */
export function formatarBrl(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor)
}

/** Data de emissao formatada em pt-BR (timezone SP). */
function dataEmissaoBR(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date())
}

export interface ParametrosPdfOrcamento {
  nomePaciente: string
  procedimento: string | null
  oQueInclui: string | null
  /** Valor em reais (numero). Formatado internamente. */
  valor: number
  parcelamento?: string | null
  resumoCaso?: string | null
  sobreOPaciente?: string | null
  procedimentoInteresse?: string | null
  validadeDias?: number
  contatoClinica?: string | null
}

/** Renderiza o PDF do orcamento pra Buffer (Node runtime). */
export async function renderizarPdfOrcamento(
  params: ParametrosPdfOrcamento
): Promise<Buffer> {
  const dados: DadosOrcamento = {
    nomePaciente: params.nomePaciente,
    procedimento: params.procedimento,
    oQueInclui: params.oQueInclui,
    valorFormatado: formatarBrl(params.valor),
    parcelamento: params.parcelamento ?? null,
    resumoCaso: params.resumoCaso ?? null,
    sobreOPaciente: params.sobreOPaciente ?? null,
    procedimentoInteresse: params.procedimentoInteresse ?? null,
    validadeDias: params.validadeDias ?? VALIDADE_PADRAO_DIAS,
    fotoDrLucasUrl: urlFotoDrLucas(),
    dataEmissao: dataEmissaoBR(),
    contatoClinica: params.contatoClinica ?? undefined,
  }

  return renderToBuffer(<OrcamentoPDF dados={dados} />)
}

/**
 * Renderiza o PDF e sobe no Supabase Storage. Retorna a URL publica do
 * documento (pra enviar via Uazapi como documento).
 */
export async function gerarEHospedarOrcamento(
  params: ParametrosPdfOrcamento & { contatoId: string }
): Promise<{
  url: string
  nomeArquivo: string
  storageBucket: string
  storagePath: string
  tamanhoBytes: number
}> {
  const buffer = await renderizarPdfOrcamento(params)

  const slug = params.nomePaciente
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40) || "paciente"

  const nomeArquivo = `orcamento-${slug}.pdf`
  const path = `orcamentos/${params.contatoId}/${Date.now()}-${nomeArquivo}`

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    throw new Error(`Falha ao subir PDF do orçamento: ${error.message}`)
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  return {
    url: data.publicUrl,
    nomeArquivo,
    storageBucket: BUCKET,
    storagePath: path,
    tamanhoBytes: buffer.length,
  }
}
