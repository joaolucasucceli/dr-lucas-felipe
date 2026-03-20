import { z } from "zod"

export const criarLeadSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  whatsapp: z.string().regex(/^\d{10,13}$/, "WhatsApp deve conter apenas dígitos (10 a 13)"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  procedimentoInteresse: z.string().optional(),
  origem: z.string().optional(),
  statusFunil: z
    .enum([
      "primeiro_atendimento",
      "qualificacao",
      "agendamento",
      "consulta_agendada",
      "consulta_realizada",
      "sinal_pago",
      "procedimento_agendado",
      "concluido",
      "perdido",
    ])
    .default("primeiro_atendimento"),
  responsavelId: z.string().cuid().optional(),
})

export const atualizarLeadSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  whatsapp: z.string().regex(/^\d{10,13}$/, "WhatsApp deve conter apenas dígitos (10 a 13)").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  procedimentoInteresse: z.string().optional(),
  origem: z.string().optional(),
  statusFunil: z
    .enum([
      "primeiro_atendimento",
      "qualificacao",
      "agendamento",
      "consulta_agendada",
      "consulta_realizada",
      "sinal_pago",
      "procedimento_agendado",
      "concluido",
      "perdido",
    ])
    .optional(),
  responsavelId: z.string().cuid().optional().nullable(),
  sobreOPaciente: z.string().optional(),
})

export const mudarStatusSchema = z.object({
  statusFunil: z.enum([
    "primeiro_atendimento",
    "qualificacao",
    "agendamento",
    "consulta_agendada",
    "consulta_realizada",
    "sinal_pago",
    "procedimento_agendado",
    "concluido",
    "perdido",
  ]),
})

export type CriarLeadInput = z.infer<typeof criarLeadSchema>
export type AtualizarLeadInput = z.infer<typeof atualizarLeadSchema>
