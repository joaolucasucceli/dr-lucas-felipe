import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { captarLeadSiteSchema } from "@/lib/validations/lead-site"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Honeypot — se preenchido, é bot
    if (body._hp) {
      // Retorna sucesso falso para não revelar detecção
      return NextResponse.json({ sucesso: true }, { status: 201 })
    }

    // Validação
    const resultado = captarLeadSiteSchema.safeParse(body)
    if (!resultado.success) {
      const detalhes = resultado.error.flatten().fieldErrors
      return NextResponse.json(
        { error: "Dados inválidos", detalhes },
        { status: 400 }
      )
    }

    const { nome, whatsapp, procedimentoInteresse } = resultado.data

    // Buscar usuário IA para atribuir como responsável
    const usuarioIa = await prisma.usuario.findFirst({
      where: { tipo: "ia", ativo: true, deletadoEm: null },
    })
    if (!usuarioIa) {
      console.warn("[captar-lead] Nenhum usuário IA ativo encontrado — lead será criado sem responsável")
    }

    // Checar se lead já existe para decidir se atribui responsável no update
    const leadExistente = await prisma.lead.findUnique({
      where: { whatsapp },
      select: { responsavelId: true },
    })

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
        // Atribuir IA apenas se lead ainda não tem responsável
        ...(!leadExistente?.responsavelId && usuarioIa ? { responsavelId: usuarioIa.id } : {}),
      },
      create: {
        nome,
        whatsapp,
        procedimentoInteresse,
        origem: "site",
        statusFunil: "acolhimento",
        consentimentoLgpd: true,
        consentimentoLgpdEm: new Date(),
        responsavelId: usuarioIa?.id || null,
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
