import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data: instancias, error } = await supabaseAdmin
    .from("config_whatsapp")
    .select(
      "id, nome, uazapiUrl, instanceId, numeroWhatsapp, webhookUrl, ativo, criadoEm, atualizadoEm"
    )
    .order("criadoEm", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ instancias: instancias ?? [] })
}
