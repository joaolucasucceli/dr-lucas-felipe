import { z } from "zod"
import { urlDeMidiaSuportada } from "@/lib/agente/midia-marketing-url"

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
  // A URL precisa ser de um endereço que o sistema saiba ler na hora de enviar.
  // Sem esta trava, mídia com endereço estranho entrava no catálogo, aparecia
  // saudável na tela e era descartada em silêncio no envio (OPE-559).
  url: z
    .string()
    .min(1, "Anexe um arquivo")
    .refine(urlDeMidiaSuportada, {
      message:
        "Endereço não suportado. Use o botão de anexar arquivo — a Ana Júlia não consegue enviar mídia de endereço externo.",
    }),
  tipo: tipoMidiaMarketingSchema,
})

export const atualizarMidiaMarketingSchema = criarMidiaMarketingSchema.partial()
