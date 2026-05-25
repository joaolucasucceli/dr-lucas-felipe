import { z } from "zod"

// Campos comerciais (valor/escopo/parcelamento) — todos opcionais.
// JLU-167 (25/05/2026): valorBaseMinBrl + valorBaseMaxBrl viraram fonte primaria
// pra Ana Julia citar FAIXA ("R$ 10k a R$ 12k"). valorEstimadoBrl mantido como
// fallback legado por 1 semana, depois deprecar.
// Quando NENHUM dos 3 estiver preenchido, IA pede mais info ao paciente.
const camposComerciais = {
  valorBaseMinBrl: z.number().positive().nullable().optional(),
  valorBaseMaxBrl: z.number().positive().nullable().optional(),
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
