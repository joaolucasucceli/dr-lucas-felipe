import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { count, error } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .select("id", { count: "exact", head: true })
    .eq("remetente", "paciente")
    .is("lidaEm", null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ total: count ?? 0 })
}
