import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q") ?? ""

  if (q.length < 2) {
    return NextResponse.json({ leads: [], agendamentos: [], procedimentos: [], total: 0 })
  }

  const [leads, agendamentos, procedimentos] = await Promise.all([
    prisma.lead.findMany({
      where: {
        deletadoEm: null,
        arquivado: false,
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { whatsapp: { contains: q } },
        ],
      },
      select: { id: true, nome: true, whatsapp: true, statusFunil: true },
      take: 5,
    }),
    prisma.agendamento.findMany({
      where: {
        lead: { nome: { contains: q, mode: "insensitive" } },
      },
      select: {
        id: true,
        dataHora: true,
        status: true,
        lead: { select: { nome: true } },
        procedimento: { select: { nome: true } },
      },
      take: 5,
    }),
    prisma.procedimento.findMany({
      where: {
        deletadoEm: null,
        nome: { contains: q, mode: "insensitive" },
      },
      select: { id: true, nome: true, ativo: true },
      take: 5,
    }),
  ])

  return NextResponse.json({
    leads,
    agendamentos,
    procedimentos,
    total: leads.length + agendamentos.length + procedimentos.length,
  })
}
