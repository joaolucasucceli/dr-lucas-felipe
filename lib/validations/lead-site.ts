import { z } from "zod"

export const captarLeadSiteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  whatsapp: z
    .string()
    .refine(
      (val) =>
        /^[1-9]{2}9\d{8}$/.test(val) || /^55[1-9]{2}9\d{8}$/.test(val),
      "Número de WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX"
    ),
  procedimentoInteresse: z.string().min(1, "Selecione um procedimento"),
  consentimentoLgpd: z.literal(true, {
    error: "Consentimento obrigatório",
  }),
  _hp: z.string().optional(), // honeypot — checagem no handler, não no Zod (evita expor campo ao bot)
})

export type CaptarLeadSiteInput = z.infer<typeof captarLeadSiteSchema>
