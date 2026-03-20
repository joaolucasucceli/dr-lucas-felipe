import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const ha3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  const leads = await prisma.lead.findMany({
    where: {
      deletadoEm: null,
      arquivado: false,
      statusFunil: { notIn: ["concluido", "perdido"] as never[] },
      OR: [
        { ultimaMovimentacaoEm: { not: null, lt: ha3dias } },
        { ultimaMovimentacaoEm: null, atualizadoEm: { lt: ha3dias } },
      ],
    },
    select: {
      id: true,
      nome: true,
      statusFunil: true,
      ultimaMovimentacaoEm: true,
      atualizadoEm: true,
      procedimentoInteresse: true,
    },
    orderBy: { atualizadoEm: "asc" },
    take: 10,
  })

  return NextResponse.json({ leads })
}
