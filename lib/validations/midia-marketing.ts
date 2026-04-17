import { z } from "zod"

export const CATEGORIAS_MIDIA = [
  "reels",
  "antes-depois",
  "depoimento",
  "procedimento",
] as const

export const TIPOS_MIDIA = ["imagem", "video"] as const

export const criarMidiaMarketingSchema = z.object({
  titulo: z.string().min(2).max(200),
  descricao: z.string().max(500).optional().nullable(),
  categoria: z.enum(CATEGORIAS_MIDIA),
  procedimento: z.string().max(100).optional().nullable(),
  url: z.string().min(1),
  tipo: z.enum(TIPOS_MIDIA),
  ativo: z.boolean().default(true),
})

export const atualizarMidiaMarketingSchema = criarMidiaMarketingSchema.partial()
