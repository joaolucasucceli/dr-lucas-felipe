import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarMarcoSchema } from "@/lib/validations/prontuario"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string; evolucaoId: string }> }

interface MarcoRecuperacao {
  descricao: string
  dataPrevista: string
  dataConcluida?: string | null
  concluido: boolean
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const body = await request.json()
  const parsed = atualizarMarcoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: paciente } = await supabaseAdmin
    .from("pacientes")
    .select("id")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select("id")
    .eq("pacienteId", id)
    .maybeSingle()

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const { data: registro } = await supabaseAdmin
    .from("registros_cirurgicos")
    .select("id, marcosRecuperacao")
    .eq("evolucaoId", evolucaoId)
    .maybeSingle()

  if (!registro) {
    return NextResponse.json({ error: "Registro cirúrgico não encontrado" }, { status: 404 })
  }

  const marcos = (registro.marcosRecuperacao as MarcoRecuperacao[] | null) || []
  const { indice, concluido, dataConcluida } = parsed.data

  if (indice < 0 || indice >= marcos.length) {
    return NextResponse.json({ error: "Índice de marco inválido" }, { status: 400 })
  }

  marcos[indice] = {
    ...marcos[indice],
    concluido,
    dataConcluida: dataConcluida ?? (concluido ? agora() : null),
  }

  const { data: atualizado, error } = await supabaseAdmin
    .from("registros_cirurgicos")
    .update({
      marcosRecuperacao: marcos as never,
      atualizadoEm: agora(),
    })
    .eq("id", registro.id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(atualizado)
}
