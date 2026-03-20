import { z } from "zod"

export const criarSprintSchema = z
  .object({
    nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    descricao: z.string().optional(),
    status: z.enum(["planejada", "em_andamento", "concluida"]).default("planejada"),
    dataInicio: z.string().datetime().optional().nullable(),
    dataFim: z.string().datetime().optional().nullable(),
    ordem: z.number().int().min(0).default(0),
  })
  .refine(
    (data) =>
      !data.dataInicio || !data.dataFim || new Date(data.dataFim) >= new Date(data.dataInicio),
    { message: "Data fim deve ser posterior à data início", path: ["dataFim"] }
  )

export const atualizarSprintSchema = z
  .object({
    nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
    descricao: z.string().optional().nullable(),
    status: z.enum(["planejada", "em_andamento", "concluida"]).optional(),
    dataInicio: z.string().datetime().optional().nullable(),
    dataFim: z.string().datetime().optional().nullable(),
    ordem: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      !data.dataInicio || !data.dataFim || new Date(data.dataFim) >= new Date(data.dataInicio),
    { message: "Data fim deve ser posterior à data início", path: ["dataFim"] }
  )

export const criarSprintItemSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  ordem: z.number().int().min(0).default(0),
})

export const atualizarSprintItemSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório").optional(),
  concluido: z.boolean().optional(),
  ordem: z.number().int().min(0).optional(),
})

export const reordenarSprintsSchema = z.object({
  itens: z.array(
    z.object({
      id: z.string(),
      ordem: z.number().int().min(0),
    })
  ),
})

export type CriarSprintInput = z.infer<typeof criarSprintSchema>
export type AtualizarSprintInput = z.infer<typeof atualizarSprintSchema>
export type CriarSprintItemInput = z.infer<typeof criarSprintItemSchema>
export type AtualizarSprintItemInput = z.infer<typeof atualizarSprintItemSchema>
