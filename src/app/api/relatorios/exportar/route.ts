import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  return NextResponse.json(
    { error: "Exportação de relatórios foi descontinuada." },
    { status: 410 }
  )
}
