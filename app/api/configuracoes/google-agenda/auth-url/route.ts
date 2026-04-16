import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { google } from "googleapis"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

const REDIRECT_URI = "https://dr-lucas-central.vercel.app/api/configuracoes/google-agenda/callback"

export async function GET(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("clientId, clientSecret")
    .eq("ativo", true)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config) {
    return NextResponse.json(
      { error: "Salve as credenciais antes de conectar" },
      { status: 400 }
    )
  }

  const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret, REDIRECT_URI)

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent",
  })

  return NextResponse.json({ url })
}
