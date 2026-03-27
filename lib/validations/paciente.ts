import { z } from "zod"

export const criarPacienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  whatsapp: z
    .string()
    .regex(/^\d{10,13}$/, "WhatsApp deve conter apenas dígitos (10 a 13)")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos")
    .optional()
    .or(z.literal("")),
  dataNascimento: z.string().optional().or(z.literal("")),
  sexo: z.enum(["feminino", "masculino"]).optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  contatoEmergencia: z.string().optional(),
  contatoEmergenciaTel: z.string().optional(),
  observacoes: z.string().optional(),
  consentimentoLgpd: z.boolean().optional(),
})

export const atualizarPacienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  whatsapp: z
    .string()
    .regex(/^\d{10,13}$/, "WhatsApp deve conter apenas dígitos (10 a 13)")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos")
    .optional()
    .or(z.literal("")),
  dataNascimento: z.string().optional().or(z.literal("")),
  sexo: z.enum(["feminino", "masculino"]).optional().nullable(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  contatoEmergencia: z.string().optional(),
  contatoEmergenciaTel: z.string().optional(),
  observacoes: z.string().optional(),
  consentimentoLgpd: z.boolean().optional(),
})

export type CriarPacienteInput = z.infer<typeof criarPacienteSchema>
export type AtualizarPacienteInput = z.infer<typeof atualizarPacienteSchema>
