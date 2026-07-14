import { z } from "zod"

export const configWhatsappSchema = z.object({
  uazapiUrl: z.string().url("URL inválida"),
  adminToken: z.string().min(10, "Token deve ter pelo menos 10 caracteres"),
})

export type ConfigWhatsappInput = z.infer<typeof configWhatsappSchema>
