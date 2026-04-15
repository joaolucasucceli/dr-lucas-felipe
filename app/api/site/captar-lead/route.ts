import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  whatsapp: z.string().min(12, "WhatsApp inválido").max(15),
  procedimentoInteresse: z.string().min(1, "Selecione um procedimento"),
  consentimentoLgpd: z.literal(true, {
    message: "Você precisa concordar com a Política de Privacidade",
  }),
  _hp: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Honeypot — se preenchido, é bot
    if (body._hp) {
      // Retorna sucesso falso para não revelar detecção
      return NextResponse.json({ sucesso: true }, { status: 201 })
    }

    // Validação
    const resultado = schema.safeParse(body)
    if (!resultado.success) {
      const detalhes = resultado.error.flatten().fieldErrors
      return NextResponse.json(
        { error: "Dados inválidos", detalhes },
        { status: 400 }
      )
    }

    const { nome, whatsapp, procedimentoInteresse } = resultado.data

    // Upsert — se lead já existe com esse WhatsApp, atualiza
    await prisma.lead.upsert({
      where: { whatsapp },
      update: {
        nome,
        procedimentoInteresse,
        origem: "site",
        consentimentoLgpd: true,
        consentimentoLgpdEm: new Date(),
        deletadoEm: null,
        arquivado: false,
        arquivadoEm: null,
      },
      create: {
        nome,
        whatsapp,
        procedimentoInteresse,
        origem: "site",
        statusFunil: "acolhimento",
        consentimentoLgpd: true,
        consentimentoLgpdEm: new Date(),
      },
    })

    return NextResponse.json({ sucesso: true }, { status: 201 })
  } catch (error) {
    console.error("[captar-lead] Erro:", error)
    return NextResponse.json(
      { error: "Erro interno. Tente novamente mais tarde." },
      { status: 500 }
    )
  }
}
