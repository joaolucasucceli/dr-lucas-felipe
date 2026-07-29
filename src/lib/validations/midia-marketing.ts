import { z } from "zod"

/**
 * O que a imagem mostra. Só `comparativo` pode ser enviado a um lead — ver
 * OPE-553: a Ana mandava foto de "antes" isolada, e até registro cirúrgico,
 * apresentando como resultado.
 */
export const TIPOS_MIDIA_MARKETING = [
  {
    valor: "comparativo",
    rotulo: "Antes e depois (na mesma imagem)",
    ajuda: "O único tipo que a Ana envia para o paciente.",
  },
  {
    valor: "antes",
    rotulo: "Só o antes",
    ajuda: "Fica no acervo, mas nunca é enviado sozinho.",
  },
  {
    valor: "pos_operatorio",
    rotulo: "Registro cirúrgico / pós imediato",
    ajuda: "Uso interno. Nunca vai para paciente.",
  },
  {
    valor: "outro",
    rotulo: "Outro",
    ajuda: "Não é enviado. Use quando não se encaixar acima.",
  },
] as const

export const tipoMidiaMarketingSchema = z.enum([
  "comparativo",
  "antes",
  "pos_operatorio",
  "outro",
])

export const criarMidiaMarketingSchema = z.object({
  descricao: z.string().min(3, "Descreva a midia").max(1000),
  url: z.string().min(1, "Anexe um arquivo"),
  tipo: tipoMidiaMarketingSchema,
})

export const atualizarMidiaMarketingSchema = criarMidiaMarketingSchema.partial()
