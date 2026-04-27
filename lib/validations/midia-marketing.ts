import { z } from "zod"

export const criarMidiaMarketingSchema = z.object({
  descricao: z.string().min(3, "Descreva a midia").max(1000),
  url: z.string().min(1, "Anexe um arquivo"),
})

export const atualizarMidiaMarketingSchema = criarMidiaMarketingSchema.partial()
