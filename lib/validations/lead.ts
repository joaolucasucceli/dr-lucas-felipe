import { z } from "zod"

const STATUS_FUNIL_VALUES = [
  "acolhimento",
  "qualificacao",
  "agendamento",
  "consulta_agendada",
] as const

export const criarLeadSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  whatsapp: z.string().regex(/^\d{10,13}$/, "WhatsApp deve conter apenas dígitos (10 a 13)"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  procedimentoInteresse: z.string().optional(),
  origem: z.string().optional(),
  statusFunil: z.enum(STATUS_FUNIL_VALUES).default("acolhimento"),
  responsavelId: z.string().cuid().optional(),
})

export const atualizarLeadSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  whatsapp: z.string().regex(/^\d{10,13}$/, "WhatsApp deve conter apenas dígitos (10 a 13)").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  procedimentoInteresse: z.string().optional(),
  origem: z.string().optional(),
  statusFunil: z.enum(STATUS_FUNIL_VALUES).optional(),
  responsavelId: z.string().cuid().optional().nullable(),
  sobreOPaciente: z.string().optional(),
})

export const mudarStatusSchema = z.object({
  statusFunil: z.enum(STATUS_FUNIL_VALUES),
})

export type CriarLeadInput = z.infer<typeof criarLeadSchema>
export type AtualizarLeadInput = z.infer<typeof atualizarLeadSchema>
