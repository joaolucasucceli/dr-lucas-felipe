import { z } from "zod"
import { CHAVES_REGIAO } from "@/lib/procedimentos/regioes"

const regiaoSchema = z.enum(CHAVES_REGIAO as [string, ...string[]], {
  error: "Região inválida",
})

const faixaSchema = {
  valorMinBrl: z.number().positive("Valor mínimo deve ser maior que zero"),
  valorMaxBrl: z.number().positive("Valor máximo deve ser maior que zero"),
  observacao: z.string().trim().max(280).nullable().optional(),
  ativo: z.boolean().default(true),
}

/** Espelha o CHECK do banco — falha aqui vira 400 legível em vez de 500. */
function validarOrdemDaFaixa(
  dados: { valorMinBrl?: number; valorMaxBrl?: number },
  ctx: z.RefinementCtx
) {
  const { valorMinBrl, valorMaxBrl } = dados
  if (valorMinBrl != null && valorMaxBrl != null && valorMaxBrl < valorMinBrl) {
    ctx.addIssue({
      code: "custom",
      path: ["valorMaxBrl"],
      message: "Valor máximo não pode ser menor que o mínimo",
    })
  }
}

export const criarProcedimentoRegiaoSchema = z
  .object({
    procedimentoId: z.string().min(1),
    regiao: regiaoSchema,
    ...faixaSchema,
  })
  .superRefine(validarOrdemDaFaixa)

export const atualizarProcedimentoRegiaoSchema = z
  .object({
    regiao: regiaoSchema.optional(),
    valorMinBrl: z.number().positive().optional(),
    valorMaxBrl: z.number().positive().optional(),
    observacao: z.string().trim().max(280).nullable().optional(),
    ativo: z.boolean().optional(),
  })
  .superRefine(validarOrdemDaFaixa)

export type CriarProcedimentoRegiaoInput = z.infer<
  typeof criarProcedimentoRegiaoSchema
>
export type AtualizarProcedimentoRegiaoInput = z.infer<
  typeof atualizarProcedimentoRegiaoSchema
>
