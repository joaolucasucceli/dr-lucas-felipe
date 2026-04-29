import { z } from "zod"

export const TIPOS_AGENDAMENTO = [
  "diagnostico",
  "consulta_online",
  "consulta_presencial",
  "procedimento",
  "retorno",
  "pos_operatorio",
] as const

export const STATUS_AGENDAMENTO = [
  "agendado",
  "confirmado",
  "cancelado",
  "realizado",
  "remarcado",
] as const

export type TipoAgendamento = (typeof TIPOS_AGENDAMENTO)[number]
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number]

export const ROTULOS_TIPO_AGENDAMENTO: Record<TipoAgendamento, string> = {
  diagnostico: "Avaliação online",
  consulta_online: "Avaliação online",
  consulta_presencial: "Consulta presencial",
  procedimento: "Procedimento",
  retorno: "Retorno",
  pos_operatorio: "Pós-operatório",
}

// Schema base — usado APENAS como fonte do .partial() do atualizarAgendamentoSchema
// (POST manual foi descontinuado; criacao agora e exclusiva da IA via
// /api/agente/registrar-agendamento, que tem seu proprio schema).
const agendamentoSchema = z.object({
  contatoId: z.string().min(1, "Contato é obrigatório"),
  procedimentoId: z.string().nullable().optional(),
  tipo: z.enum(TIPOS_AGENDAMENTO).optional(),
  dataHora: z.string().datetime({ offset: true }).or(z.string().min(10)),
  duracao: z.number().int().positive().optional(),
  observacao: z.string().nullable().optional(),
  status: z.enum(STATUS_AGENDAMENTO).default("agendado"),
})

export const atualizarAgendamentoSchema = agendamentoSchema.partial()

export type AtualizarAgendamentoInput = z.infer<typeof atualizarAgendamentoSchema>
