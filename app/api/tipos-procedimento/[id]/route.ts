import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"

export async function PATCH() {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  return NextResponse.json(
    { error: "Tipos de procedimento são fixos e não podem ser personalizados" },
    { status: 410 }
  )
}

export async function DELETE() {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  return NextResponse.json(
    { error: "Tipos de procedimento são fixos e não podem ser personalizados" },
    { status: 410 }
  )
}
