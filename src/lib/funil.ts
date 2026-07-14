export const ETAPAS_FUNIL = [
  "acolhimento",
  "qualificacao",
  "orcamento",
  "agendamento",
  "consulta_agendada",
  "atendimento_humano",
] as const

export type EtapaFunil = (typeof ETAPAS_FUNIL)[number]

export const ETAPAS_RETORNO_IA = [
  "acolhimento",
  "qualificacao",
  "orcamento",
  "agendamento",
  "consulta_agendada",
] as const

export type EtapaRetornoIA = (typeof ETAPAS_RETORNO_IA)[number]

export const FUNIL_LABELS: Record<EtapaFunil, string> = {
  acolhimento: "Acolhimento",
  qualificacao: "Qualificação",
  orcamento: "Orçamento",
  agendamento: "Agendamento",
  consulta_agendada: "Reunião Agendada",
  atendimento_humano: "Atendimento Humano",
}

export const FUNIL_CORES: Record<EtapaFunil, string> = {
  acolhimento: "#a1a1aa",
  qualificacao: "#93c5fd",
  orcamento: "#fbbf24",
  agendamento: "#a5b4fc",
  consulta_agendada: "#c4b5fd",
  atendimento_humano: "#fda4af",
}

export function isEtapaFunil(etapa: string | null | undefined): etapa is EtapaFunil {
  return !!etapa && (ETAPAS_FUNIL as readonly string[]).includes(etapa)
}

export function isEtapaRetornoIA(
  etapa: string | null | undefined
): etapa is EtapaRetornoIA {
  return !!etapa && (ETAPAS_RETORNO_IA as readonly string[]).includes(etapa)
}

export function etapaRetornoIASegura(
  etapa: string | null | undefined
): EtapaRetornoIA {
  return isEtapaRetornoIA(etapa) ? etapa : "qualificacao"
}
