import { z } from "zod"

export const configGoogleSchema = z.object({
  clientId: z.string().min(10, "Client ID deve ter pelo menos 10 caracteres"),
  clientSecret: z.string().min(10, "Client Secret deve ter pelo menos 10 caracteres"),
  refreshToken: z.string().min(10, "Refresh Token deve ter pelo menos 10 caracteres"),
  calendarId: z.string().min(1, "Calendar ID é obrigatório"),
})

export type ConfigGoogleInput = z.infer<typeof configGoogleSchema>
