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

  await prisma.mensagemWhatsapp.updateMany({
    where: {
      conversaId: parse.data.conversaId,
      remetente: "paciente",
      lidaEm: null,
    },
    data: { lidaEm: new Date() },
  })

  return NextResponse.json({ sucesso: true })
}
