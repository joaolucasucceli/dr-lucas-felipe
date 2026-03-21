import { createHash } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { leadId } = await params

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  if (lead.deletadoEm) {
    return NextResponse.json({ error: "Lead já anonimizado" }, { status: 409 })
  }

  const whatsappHash = createHash("sha256").update(lead.whatsapp).digest("hex")

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        nome: "Usuário Anonimizado",
        whatsapp: whatsappHash,
        email: null,
        sobreOPaciente: null,
        deletadoEm: new Date(),
      },
    }),
    prisma.mensagemWhatsapp.deleteMany({ where: { leadId } }),
  ])

  return NextResponse.json({ ok: true })
}
