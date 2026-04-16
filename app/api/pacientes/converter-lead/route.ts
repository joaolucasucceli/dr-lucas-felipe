import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
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

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .is("deletadoEm", null)
    .maybeSingle()

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
