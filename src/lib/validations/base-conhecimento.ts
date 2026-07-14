import { z } from "zod"

export const criarBaseConhecimentoSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres").max(200),
  conteudo: z.string().min(5, "Conteúdo deve ter pelo menos 5 caracteres"),
})

export const atualizarBaseConhecimentoSchema = z.object({
  titulo: z.string().min(2).max(200).optional(),
  conteudo: z.string().min(5).optional(),
})

export type CriarBaseConhecimentoInput = z.infer<typeof criarBaseConhecimentoSchema>
export type AtualizarBaseConhecimentoInput = z.infer<typeof atualizarBaseConhecimentoSchema>
