import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const filtro = searchParams.get("filtro") || "todas"
  const busca = searchParams.get("busca") || ""
  const userId = auth.session.user.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    encerradaEm: null,
  }

  if (filtro === "minhas") {
    where.atendenteId = userId
  }

  if (filtro === "pendentes") {
    where.modoConversa = "ia"
    where.mensagens = {
      some: {
        remetente: "paciente",
        lidaEm: null,
      },
    }
  }

  if (busca) {
    where.lead = {
      OR: [
        { nome: { contains: busca, mode: "insensitive" } },
        { whatsapp: { contains: busca } },
      ],
    }
  }

  const conversas = await prisma.conversa.findMany({
    where,
    orderBy: { ultimaMensagemEm: "desc" },
    take: 50,
    include: {
      lead: {
        select: {
          id: true,
          nome: true,
          whatsapp: true,
          statusFunil: true,
          procedimentoInteresse: true,
        },
      },
      atendente: {
        select: { id: true, nome: true },
      },
      mensagens: {
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: {
          id: true,
          conteudo: true,
          remetente: true,
          tipo: true,
          criadoEm: true,
        },
      },
      _count: {
        select: {
          mensagens: {
            where: {
              remetente: "paciente",
              lidaEm: null,
            },
          },
        },
      },
    },
  })

  const resultado = conversas.map((c) => ({
    id: c.id,
    leadId: c.leadId,
    etapa: c.etapa,
    modoConversa: c.modoConversa,
    atendenteId: c.atendenteId,
    atendente: c.atendente,
    ultimaMensagemEm: c.ultimaMensagemEm,
    lead: c.lead,
    ultimaMensagem: c.mensagens[0] || null,
    naoLidas: c._count.mensagens,
  }))

  return NextResponse.json({ conversas: resultado })
}
