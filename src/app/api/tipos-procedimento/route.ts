import { NextResponse } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth-helpers"
import { TIPOS_PROCEDIMENTO_API } from "@/lib/procedimentos/tipos"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  return NextResponse.json({ dados: TIPOS_PROCEDIMENTO_API })
}

export async function POST() {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  return NextResponse.json(
    { error: "Tipos de procedimento são fixos e não podem ser personalizados" },
    { status: 410 }
  )
}
