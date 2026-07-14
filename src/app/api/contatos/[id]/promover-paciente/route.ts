import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { promoverContatoPaciente } from "@/lib/contatos/promover-paciente"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const resultado = await promoverContatoPaciente(id, auth.session.user.id)
    return NextResponse.json(
      { contato: resultado.contato, jaEraPaciente: resultado.jaEraPaciente },
      { status: resultado.jaEraPaciente ? 200 : 201 }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
