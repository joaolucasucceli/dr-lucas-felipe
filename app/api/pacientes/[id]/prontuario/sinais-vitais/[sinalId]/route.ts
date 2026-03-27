import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string; sinalId: string }> }

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, sinalId } = await params

  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id, deletadoEm: null } },
    select: { id: true },
  })

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const sinal = await prisma.sinalVital.findFirst({
    where: { id: sinalId, prontuarioId: prontuario.id },
  })

  if (!sinal) {
    return NextResponse.json({ error: "Sinal vital não encontrado" }, { status: 404 })
  }

  await prisma.sinalVital.delete({ where: { id: sinalId } })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "SinalVital",
    entidadeId: sinalId,
    dadosAntes: sinal as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ sucesso: true })
}
