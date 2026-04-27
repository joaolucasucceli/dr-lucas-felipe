import { z } from "zod"

export const configGoogleSchema = z.object({
  clientId: z.string().min(10, "Client ID deve ter pelo menos 10 caracteres"),
  clientSecret: z.string().min(10, "Client Secret deve ter pelo menos 10 caracteres"),
})

export const escolherCalendarIdSchema = z.object({
  calendarId: z.string().min(1, "Selecione uma agenda"),
})

export type ConfigGoogleInput = z.infer<typeof configGoogleSchema>
export type EscolherCalendarIdInput = z.infer<typeof escolherCalendarIdSchema>
