import { z } from "zod"

const STATUS_FUNIL_VALUES = [
  "acolhimento",
  "qualificacao",
  "agendamento",
  "consulta_agendada",
] as const

const TIPO_CONTATO = ["lead", "paciente"] as const

const whatsappSchema = z.string().regex(/^\d{10,13}$/, "WhatsApp deve conter apenas dígitos (10 a 13)")
const whatsappOptional = whatsappSchema.optional().or(z.literal(""))
const emailOptional = z.string().email("Email inválido").optional().or(z.literal(""))
const cpfOptional = z.string().regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos").optional().or(z.literal(""))

export const criarContatoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  whatsapp: whatsappSchema,
  email: emailOptional,
  procedimentoInteresse: z.string().optional(),
  origem: z.string().optional(),
  statusFunil: z.enum(STATUS_FUNIL_VALUES).default("acolhimento"),
  responsavelId: z.string().cuid().optional(),
  consentimentoLgpd: z.boolean().optional(),
  // Permite criar direto como paciente (cria prontuario na sequencia).
  tipo: z.enum(TIPO_CONTATO).default("lead"),
})

export const atualizarContatoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  whatsapp: whatsappOptional,
  email: emailOptional,
  procedimentoInteresse: z.string().optional(),
  origem: z.string().optional(),
  statusFunil: z.enum(STATUS_FUNIL_VALUES).optional(),
  responsavelId: z.string().cuid().optional().nullable(),
  sobreOPaciente: z.string().optional(),
  cpf: cpfOptional,
  dataNascimento: z.string().optional().or(z.literal("")),
  sexo: z.enum(["feminino", "masculino"]).optional().nullable(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  contatoEmergencia: z.string().optional(),
  contatoEmergenciaTel: z.string().optional(),
  consentimentoLgpd: z.boolean().optional(),
})

export const mudarStatusSchema = z.object({
  statusFunil: z.enum(STATUS_FUNIL_VALUES),
})

export const tipoContatoSchema = z.enum(TIPO_CONTATO)

export type CriarContatoInput = z.infer<typeof criarContatoSchema>
export type AtualizarContatoInput = z.infer<typeof atualizarContatoSchema>
export type TipoContato = z.infer<typeof tipoContatoSchema>

export { STATUS_FUNIL_VALUES, TIPO_CONTATO }
