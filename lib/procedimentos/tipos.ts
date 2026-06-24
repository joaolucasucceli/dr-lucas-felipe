export const TIPOS_PROCEDIMENTO = [
  "Cirúrgico",
  "Estético",
  "Injetável",
  "Minimamente Invasivo",
] as const

export type TipoProcedimento = (typeof TIPOS_PROCEDIMENTO)[number]

export const TIPOS_PROCEDIMENTO_API = TIPOS_PROCEDIMENTO.map((nome) => ({
  id: nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-"),
  nome,
  ativo: true,
}))

export function isTipoProcedimento(valor: string): valor is TipoProcedimento {
  return TIPOS_PROCEDIMENTO.includes(valor as TipoProcedimento)
}
