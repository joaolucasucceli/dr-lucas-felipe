import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const conversaId = searchParams.get("conversaId")
  const cursor = searchParams.get("cursor")
  const limite = Math.min(Number(searchParams.get("limite")) || 50, 100)

  if (!conversaId) {
    return NextResponse.json({ error: "conversaId obrigatório" }, { status: 400 })
  }

  const mensagens = await prisma.mensagemWhatsapp.findMany({
    where: { conversaId },
    orderBy: { criadoEm: "desc" },
    take: limite + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      replyTo: {
        select: { id: true, conteudo: true, remetente: true },
      },
    },
  })

  const temMais = mensagens.length > limite
  if (temMais) mensagens.pop()

  // Reverter para ordem cronológica
  mensagens.reverse()

  return NextResponse.json({
    mensagens,
    proximoCursor: temMais ? mensagens[0]?.id : null,
  })
}
