import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { z } from "zod"

const schema = z.object({
  conversaId: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "conversaId obrigatório" }, { status: 400 })
  }

  const conversa = await prisma.conversa.findUnique({
    where: { id: parse.data.conversaId },
  })

  if (!conversa) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  if (conversa.modoConversa === "humano") {
    return NextResponse.json({ error: "Conversa já está em modo humano" }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.conversa.update({
      where: { id: conversa.id },
      data: {
        modoConversa: "humano",
        atendenteId: auth.session.user.id,
      },
    }),
    prisma.lead.update({
      where: { id: conversa.leadId },
      data: { responsavelId: auth.session.user.id },
    }),
  ])

  return NextResponse.json({ sucesso: true, modoConversa: "humano" })
}
