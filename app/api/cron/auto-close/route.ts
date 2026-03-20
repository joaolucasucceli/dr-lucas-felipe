import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarCronSecret } from "@/lib/cron-auth"

export async function GET(request: NextRequest) {
  const erro = validarCronSecret(request)
  if (erro) return erro

  const ha24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Buscar conversas com 24h+ de silêncio, follow-up "24h" já enviado, ainda abertas
  const conversas = await prisma.conversa.findMany({
    where: {
      encerradaEm: null,
      ultimaMensagemEm: {
        not: null,
        lt: ha24h,
      },
      followUpEnviados: {
        has: "24h",
      },
    },
    select: { id: true },
  })

  let encerradas = 0

  for (const conversa of conversas) {
    try {
      await prisma.conversa.update({
        where: { id: conversa.id },
        data: { encerradaEm: new Date() },
      })
      encerradas++
    } catch (error) {
      console.error(`[Cron Auto-close] Erro ao encerrar conversa ${conversa.id}:`, error)
    }
  }

  return NextResponse.json({ encerradas, timestamp: new Date().toISOString() })
}
