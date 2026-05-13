import { z } from "zod"

// Campos comerciais (valor/escopo/parcelamento) — todos opcionais.
// Quando valorEstimadoBrl for null, a IA pede mais info pro paciente em vez de citar numero.
const camposComerciais = {
  valorEstimadoBrl: z.number().nonnegative().nullable().optional(),
  valorCheioBrl: z.number().nonnegative().nullable().optional(),
  parcelamento: z.string().nullable().optional(),
  escopoOferta: z.string().nullable().optional(),
}

export const criarProcedimentoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipo: z.string().min(2, "Tipo deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  duracaoMin: z.number().int("Duração deve ser um número inteiro").positive("Duração deve ser maior que zero"),
  posOperatorio: z.string().optional(),
  ativo: z.boolean().default(true),
  ...camposComerciais,
})

export const atualizarProcedimentoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  tipo: z.string().min(2, "Tipo deve ter pelo menos 2 caracteres").optional(),
  descricao: z.string().optional(),
  duracaoMin: z.number().int().positive().optional(),
  posOperatorio: z.string().optional(),
  ativo: z.boolean().optional(),
  ...camposComerciais,
})

export type CriarProcedimentoInput = z.infer<typeof criarProcedimentoSchema>
export type AtualizarProcedimentoInput = z.infer<typeof atualizarProcedimentoSchema>
