import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("refreshToken")
    .eq("ativo", true)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    configurado: !!config,
    conectado: !!(config?.refreshToken),
  })
}
