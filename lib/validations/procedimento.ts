import { z } from "zod"

export const criarProcedimentoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipo: z.string().min(2, "Tipo deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  valorBase: z.number().min(0, "Valor deve ser maior ou igual a zero").optional(),
  duracaoMin: z.number().int("Duração deve ser um número inteiro").positive("Duração deve ser maior que zero"),
  posOperatorio: z.string().optional(),
  ativo: z.boolean().default(true),
})

export const atualizarProcedimentoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  tipo: z.string().min(2, "Tipo deve ter pelo menos 2 caracteres").optional(),
  descricao: z.string().optional(),
  valorBase: z.number().min(0, "Valor deve ser maior ou igual a zero").optional(),
  duracaoMin: z.number().int().positive().optional(),
  posOperatorio: z.string().optional(),
  ativo: z.boolean().optional(),
})

export type CriarProcedimentoInput = z.infer<typeof criarProcedimentoSchema>
export type AtualizarProcedimentoInput = z.infer<typeof atualizarProcedimentoSchema>
