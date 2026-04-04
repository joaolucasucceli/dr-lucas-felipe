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

  if (conversa.modoConversa === "ia") {
    return NextResponse.json({ error: "Conversa já está em modo IA" }, { status: 400 })
  }

  const usuarioIa = await prisma.usuario.findFirst({
    where: { tipo: "ia", ativo: true, deletadoEm: null },
  })

  await prisma.$transaction([
    prisma.conversa.update({
      where: { id: conversa.id },
      data: {
        modoConversa: "ia",
        atendenteId: null,
      },
    }),
    prisma.lead.update({
      where: { id: conversa.leadId },
      data: { responsavelId: usuarioIa?.id || null },
    }),
  ])

  return NextResponse.json({ sucesso: true, modoConversa: "ia" })
}
