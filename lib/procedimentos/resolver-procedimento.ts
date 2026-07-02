import { supabaseAdmin } from "@/lib/supabase"

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
  const pediuSoAbdome = contemAlgum(interesse, [
    "so abdome",
    "so abdomen",
    "so barriga",
  ])
  const pediuAbdomeFlancos = contemAlgum(interesse, [
    "abdome flancos",
    "abdomen flancos",
    "abdome + flancos",
    "abdomen + flancos",
    "barriga flancos",
  ])
  const pediuSemEnxerto = contemAlgum(interesse, ["sem enxerto"])
  const pediuComEnxerto =
    pediuOferta && contemAlgum(interesse, ["com enxerto", "enxerto gluteo"])

  if (
    !pediuOferta &&
    !pediuSoAbdome &&
    !pediuAbdomeFlancos &&
    !pediuSemEnxerto &&
    !pediuComEnxerto
  ) {
    return null
  }

  if (pediuComEnxerto) {
    return encontrarPorId(procedimentos, "proc-oferta-pm-mini-lipo-completa")
  }

  if (pediuSoAbdome) {
    return encontrarPorId(procedimentos, "proc-oferta-pm-so-abdome")
  }

  if (pediuSemEnxerto || pediuAbdomeFlancos) {
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

  const mencionaLipo = contemAlgum(interesse, [
    "mini lipo",
    "minilipo",
    "lipo fracionada",
    "lipoaspiracao",
    "lipo",
    "abdome",
    "abdomen",
    "barriga",
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
