import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { mudarStatusSchema } from "@/lib/validations/lead"
import { converterLeadParaPaciente } from "@/lib/pacientes/converter-lead"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = mudarStatusSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const lead = await prisma.lead.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  // Atendente só pode mover leads atribuídos a si
  const perfil = auth.session.user.perfil
  if (
    perfil === "atendente" &&
    lead.responsavelId !== auth.session.user.id
  ) {
    return NextResponse.json(
      { error: "Sem permissão para mover este lead" },
      { status: 403 }
    )
  }

  const statusAnterior = lead.statusFunil
  const novoStatus = parsed.data.statusFunil

  // Preparar dados de atualização
  const dataUpdate: Record<string, unknown> = {
    statusFunil: novoStatus,
    ultimaMovimentacaoEm: new Date(),
  }

  // Salvar motivoPerda quando movendo para perdido, limpar quando saindo
  if (novoStatus === "perdido") {
    dataUpdate.motivoPerda = parsed.data.motivoPerda
  } else if (statusAnterior === "perdido") {
    dataUpdate.motivoPerda = null
  }

  const leadAtualizado = await prisma.lead.update({
    where: { id },
    data: dataUpdate,
    select: {
      id: true,
      nome: true,
      statusFunil: true,
      motivoPerda: true,
    },
  })

  // Trigger automático: converter Lead → Paciente quando status = "concluido"
  if (novoStatus === "concluido") {
    try {
      await converterLeadParaPaciente(id, auth.session.user.id)
    } catch (err) {
      // Conversão falhou mas status já foi atualizado — não reverter
      console.error("[Conversão Lead→Paciente] Erro:", err)
    }
  }

  return NextResponse.json(leadAtualizado)
}
