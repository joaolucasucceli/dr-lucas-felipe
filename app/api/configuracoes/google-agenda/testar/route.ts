import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { listarEventos } from "@/lib/google-calendar"

export async function GET() {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  try {
    const agora = new Date()
    const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000)
    await listarEventos(agora, amanha)
    return NextResponse.json({ conectado: true })
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Erro desconhecido"
    return NextResponse.json({ conectado: false, erro })
  }
}
