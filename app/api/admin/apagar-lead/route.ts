import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { limparMemoria } from "@/lib/agente/memoria"
import { obterELimparBuffer } from "@/lib/agente/buffer"

export const dynamic = "force-dynamic"
export const maxDuration = 30

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  return req.headers.get("x-admin-secret") === secret
}

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const url = new URL(req.url)
  const whatsapp = url.searchParams.get("whatsapp")
  if (!whatsapp) {
    return NextResponse.json({ error: "Falta whatsapp=..." }, { status: 400 })
  }

  const lead = await prisma.lead.findUnique({ where: { whatsapp } })
  if (!lead) {
    return NextResponse.json({ error: "Lead nao encontrado", whatsapp }, { status: 404 })
  }

  const deletados: Record<string, number> = {}

  deletados.fotosLead = (
    await prisma.fotoLead.deleteMany({ where: { leadId: lead.id } })
  ).count
  deletados.mensagensWhatsapp = (
    await prisma.mensagemWhatsapp.deleteMany({ where: { leadId: lead.id } })
  ).count
  deletados.conversas = (
    await prisma.conversa.deleteMany({ where: { leadId: lead.id } })
  ).count
  deletados.agendamentos = (
    await prisma.agendamento.deleteMany({ where: { leadId: lead.id } })
  ).count
  deletados.leads = (
    await prisma.lead.deleteMany({ where: { id: lead.id } })
  ).count

  // Limpar Redis (memoria 48h + buffer)
  const chatId = `${whatsapp}@s.whatsapp.net`
  try {
    await limparMemoria(chatId)
    await obterELimparBuffer(chatId)
  } catch (err) {
    console.error("[admin.apagar-lead] falha Redis:", err)
  }

  return NextResponse.json({ ok: true, whatsapp, deletados })
}
