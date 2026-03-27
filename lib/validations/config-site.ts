import { z } from "zod"

export const configSiteSchema = z.object({
  whatsappNumero: z.string().optional(),
  whatsappMensagem: z.string().optional(),
  medicoNome: z.string().optional(),
  medicoEspecialidade: z.string().optional(),
  medicoCrm: z.string().optional(),
  instagramUrl: z
    .string()
    .url("URL do Instagram inválida")
    .optional()
    .or(z.literal("")),
  contatoTelefone: z.string().optional(),
  contatoEndereco: z.string().optional(),
  contatoCidade: z.string().optional(),
})

export type ConfigSiteInput = z.infer<typeof configSiteSchema>
