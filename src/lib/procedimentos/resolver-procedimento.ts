import { supabaseAdmin } from "@/lib/supabase"
import { extrairRegioesDoTexto } from "@/lib/procedimentos/regioes"

type ProcedimentoResumo = {
  id: string
  nome: string | null
}

export type ProcedimentoResolvido = {
  id: string
  nome: string
  origem: "id_informado" | "interesse"
}

function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function contemAlgum(texto: string, termos: string[]): boolean {
  return termos.some((termo) => texto.includes(termo))
}

function procedimentoValido(
  procedimento: ProcedimentoResumo | null | undefined
) {
  if (!procedimento?.id || !procedimento.nome) return null
  return {
    id: procedimento.id,
    nome: procedimento.nome,
  }
}

function encontrarPorId(
  procedimentos: ProcedimentoResumo[],
  id: string
): ProcedimentoResumo | null {
  return procedimentos.find((p) => p.id === id) ?? null
}

function encontrarPorNome(
  procedimentos: ProcedimentoResumo[],
  predicate: (
    nomeNormalizado: string,
    procedimento: ProcedimentoResumo
  ) => boolean
): ProcedimentoResumo | null {
  return (
    procedimentos.find((procedimento) =>
      predicate(normalizarTexto(procedimento.nome), procedimento)
    ) ?? null
  )
}

function resolverOfertaPacienteModelo(
  interesse: string,
  procedimentos: ProcedimentoResumo[]
): ProcedimentoResumo | null {
  const pediuOferta = contemAlgum(interesse, ["paciente modelo", "oferta"])
  const pediuSemEnxerto = contemAlgum(interesse, ["sem enxerto"])
  const pediuComEnxerto = contemAlgum(interesse, ["com enxerto", "enxerto gluteo"])

  // O combo é decidido pelo CONJUNTO de regiões citadas, não por variação de
  // escrita. A lista antiga casava "abdome flancos" mas não "abdome e flancos"
  // nem "abdome, flancos" — um "e" mandava o lead para o procedimento genérico.
  // Extrair as regiões elimina a classe do problema em vez de cada variante.
  const regioes = new Set(extrairRegioesDoTexto(interesse).chaves)
  const temAbdome = regioes.has("abdome")
  const temFlancos = regioes.has("flancos")
  const temGluteo = regioes.has("gluteo")

  if (!pediuOferta && !pediuSemEnxerto && !pediuComEnxerto) return null

  // Abdome + flancos + glúteo (ou menção explícita a enxerto) = combo completo.
  if (pediuComEnxerto || (temAbdome && temFlancos && temGluteo)) {
    return encontrarPorId(procedimentos, "proc-oferta-pm-mini-lipo-completa")
  }

  if (temAbdome && temFlancos) {
    return encontrarPorId(
      procedimentos,
      "proc-oferta-pm-abdome-flancos-sem-enxerto"
    )
  }

  // Abdome sozinho — inclusive quando o paciente escreve "só abdome".
  if (temAbdome) {
    return encontrarPorId(procedimentos, "proc-oferta-pm-so-abdome")
  }

  // "sem enxerto" sem região identificada: o combo sem enxerto é o padrão.
  if (pediuSemEnxerto) {
    return encontrarPorId(
      procedimentos,
      "proc-oferta-pm-abdome-flancos-sem-enxerto"
    )
  }

  return null
}

function resolverPorInteresse(
  interesseOriginal: string | null | undefined,
  procedimentos: ProcedimentoResumo[]
): ProcedimentoResumo | null {
  const interesse = normalizarTexto(interesseOriginal)
  if (!interesse) return null

  const oferta = resolverOfertaPacienteModelo(interesse, procedimentos)
  if (oferta) return oferta

  const mencionaPmma = interesse.includes("pmma")
  if (mencionaPmma) {
    const mencionaGluteo = contemAlgum(interesse, [
      "gluteo",
      "gluteos",
      "bumbum",
    ])
    if (mencionaGluteo) {
      return encontrarPorNome(
        procedimentos,
        (nome) => nome.includes("pmma") && nome.includes("gluteo")
      )
    }

    return (
      encontrarPorId(procedimentos, "proc-pmma") ??
      encontrarPorNome(procedimentos, (nome) => nome.includes("pmma"))
    )
  }

  // Qualquer regiao anatomica conhecida conta como intencao de lipo. Antes de
  // 22/07/2026 so "abdome/abdomen/barriga" estavam nesta lista, entao "quero na
  // papada", "culote" ou "flancos" resolviam para NULL — o agendamento ficava
  // sem procedimento vinculado e a referencia de valor por regiao nao era
  // montada. A lista de regioes vem de src/lib/procedimentos/regioes.ts.
  const { chaves: regioesMencionadas } = extrairRegioesDoTexto(interesse)
  const mencionaLipo =
    regioesMencionadas.length > 0 ||
    contemAlgum(interesse, [
      "mini lipo",
      "minilipo",
      "lipo fracionada",
      "lipoaspiracao",
      "lipo",
    ])
  const mencionaEnxertoOuGluteo = contemAlgum(interesse, [
    "enxerto",
    "gluteo",
    "gluteos",
    "bumbum",
  ])

  if (mencionaLipo && mencionaEnxertoOuGluteo) {
    return (
      encontrarPorId(procedimentos, "proc-lipo-glutea") ??
      encontrarPorNome(
        procedimentos,
        (nome) =>
          nome.includes("lipo") &&
          (nome.includes("enxerto") || nome.includes("gluteo"))
      )
    )
  }

  if (mencionaLipo) {
    return (
      encontrarPorId(procedimentos, "proc-mini-lipo") ??
      encontrarPorNome(
        procedimentos,
        (nome) => nome.includes("mini lipo") || nome.includes("lipo fracionada")
      )
    )
  }

  return null
}

export async function resolverProcedimentoPorInteresse(params: {
  procedimentoId?: string | null
  procedimentoInteresse?: string | null
}): Promise<ProcedimentoResolvido | null> {
  const { procedimentoId, procedimentoInteresse } = params

  const { data: procedimentos, error } = await supabaseAdmin
    .from("procedimentos")
    .select("id, nome")
    .eq("ativo", true)
    .is("deletadoEm", null)

  if (error) {
    console.error(
      "[procedimentos] Falha ao buscar procedimentos ativos:",
      error.message
    )
    return null
  }

  const ativos = (procedimentos ?? []) as ProcedimentoResumo[]

  if (procedimentoId) {
    const procedimentoInformado = procedimentoValido(
      encontrarPorId(ativos, procedimentoId)
    )
    if (procedimentoInformado) {
      return { ...procedimentoInformado, origem: "id_informado" }
    }

    console.warn(
      "[procedimentos] procedimentoId informado invalido ou inativo",
      {
        procedimentoId,
      }
    )
  }

  const resolvido = procedimentoValido(
    resolverPorInteresse(procedimentoInteresse, ativos)
  )
  if (!resolvido) {
    console.warn(
      "[procedimentos] Nao foi possivel resolver procedimento por interesse",
      {
        procedimentoInteresse,
      }
    )
    return null
  }

  return { ...resolvido, origem: "interesse" }
}

export const __resolverProcedimentoTeste = {
  normalizarTexto,
  resolverPorInteresse,
}
