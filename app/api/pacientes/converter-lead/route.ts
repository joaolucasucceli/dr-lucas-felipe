import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { converterLeadParaPaciente } from "@/lib/pacientes/converter-lead"

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const { leadId } = body

  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json(
      { error: "leadId é obrigatório" },
      { status: 400 }
    )
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId, deletadoEm: null },
  })

  if (!lead) {
    return NextResponse.json(
      { error: "Lead não encontrado" },
      { status: 404 }
    )
  }

  const resultado = await converterLeadParaPaciente(leadId, auth.session.user.id)

  return NextResponse.json({
    paciente: resultado.paciente,
    jaCriado: resultado.jaCriado,
  }, { status: resultado.jaCriado ? 200 : 201 })
}
