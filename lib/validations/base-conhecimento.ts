import { z } from "zod"

export const SECOES_BASE_CONHECIMENTO = [
  "clinica",
  "procedimentos",
  "pos-operatorio",
  "pagamento",
  "geral",
] as const

export const criarBaseConhecimentoSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres").max(200),
  conteudo: z.string().min(5, "Conteúdo deve ter pelo menos 5 caracteres"),
  secao: z.enum(SECOES_BASE_CONHECIMENTO, {
    message: "Seção inválida",
  }),
  ordem: z.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
})

export const atualizarBaseConhecimentoSchema = z.object({
  titulo: z.string().min(2).max(200).optional(),
  conteudo: z.string().min(5).optional(),
  secao: z.enum(SECOES_BASE_CONHECIMENTO).optional(),
  ordem: z.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
})

export type CriarBaseConhecimentoInput = z.infer<typeof criarBaseConhecimentoSchema>
export type AtualizarBaseConhecimentoInput = z.infer<typeof atualizarBaseConhecimentoSchema>
