import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiSecret } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { whatsapp?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { whatsapp } = body
  if (!whatsapp) {
    return NextResponse.json({ error: "whatsapp é obrigatório" }, { status: 400 })
  }

  // Buscar lead existente
  let lead = await prisma.lead.findUnique({
    where: { whatsapp },
  })

  // Se não existe, criar novo lead com responsável IA
  if (!lead) {
    const usuarioIa = await prisma.usuario.findFirst({
      where: { tipo: "ia", ativo: true, deletadoEm: null },
    })

    lead = await prisma.lead.create({
      data: {
        nome: `WhatsApp ${whatsapp}`,
        whatsapp,
        origem: "whatsapp",
        statusFunil: "primeiro_atendimento",
        responsavelId: usuarioIa?.id || null,
      },
    })
  }

  // Buscar conversa ativa (mais recente)
  const conversa = await prisma.conversa.findFirst({
    where: { leadId: lead.id },
    orderBy: { criadoEm: "desc" },
  })

  return NextResponse.json({
    lead: {
      id: lead.id,
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      statusFunil: lead.statusFunil,
      procedimentoInteresse: lead.procedimentoInteresse,
      origem: lead.origem,
    },
    conversa: conversa
      ? { id: conversa.id, etapa: conversa.etapa }
      : null,
    sobreOPaciente: lead.sobreOPaciente || null,
  })
}
