import { z } from "zod"
import { TIPOS_PROCEDIMENTO } from "@/lib/procedimentos/tipos"
import { normalizarTextoProcedimento } from "@/lib/procedimentos/texto"

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
  parcelamento: z.string().nullable().optional().transform(normalizarTextoProcedimento),
  escopoOferta: z.string().nullable().optional().transform(normalizarTextoProcedimento),
}

const tipoProcedimentoSchema = z.enum(TIPOS_PROCEDIMENTO, {
  error: "Tipo de procedimento inválido",
})

const textoProcedimentoSchema = z.string().optional().transform(normalizarTextoProcedimento)

export const criarProcedimentoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipo: tipoProcedimentoSchema,
  descricao: textoProcedimentoSchema,
  duracaoMin: z.number().int("Duração deve ser um número inteiro").positive("Duração deve ser maior que zero"),
  posOperatorio: textoProcedimentoSchema,
  ativo: z.boolean().default(true),
  ...camposComerciais,
})

export const atualizarProcedimentoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  tipo: tipoProcedimentoSchema.optional(),
  descricao: textoProcedimentoSchema,
  duracaoMin: z.number().int().positive().optional(),
  posOperatorio: textoProcedimentoSchema,
  ativo: z.boolean().optional(),
  ...camposComerciais,
})

export type CriarProcedimentoInput = z.infer<typeof criarProcedimentoSchema>
export type AtualizarProcedimentoInput = z.infer<typeof atualizarProcedimentoSchema>
