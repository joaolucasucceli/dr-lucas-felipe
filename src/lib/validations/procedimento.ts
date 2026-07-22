import { z } from "zod"
import { TIPOS_PROCEDIMENTO } from "@/lib/procedimentos/tipos"
import { normalizarTextoProcedimento } from "@/lib/procedimentos/texto"

// Campos comerciais (valor/escopo/parcelamento) — todos opcionais.
// ATENCAO: nenhum destes campos chega na Ana Julia. Desde 22/07/2026 ela nao
// cita valor em hipotese alguma (a rota /api/agente/consultar-procedimentos nao
// seleciona campo de preco). Sao referencia interna do dashboard. Valor por
// REGIAO, que e o que o Dr. Lucas usa pra fechar orcamento, fica em
// `procedimento_regioes` — ver src/lib/validations/procedimento-regiao.ts.
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
