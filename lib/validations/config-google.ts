import { z } from "zod"

export const configGoogleSchema = z.object({
  clientId: z.string().min(10, "Client ID deve ter pelo menos 10 caracteres"),
  clientSecret: z.string().min(10, "Client Secret deve ter pelo menos 10 caracteres"),
})

export type ConfigGoogleInput = z.infer<typeof configGoogleSchema>
