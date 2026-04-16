import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { google } from "googleapis"
import { supabaseAdmin } from "@/lib/supabase"
import { agora } from "@/lib/db-utils"

const REDIRECT_URI = "https://dr-lucas-central.vercel.app/api/configuracoes/google-agenda/callback"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/configuracoes/google-agenda?erro=acesso_negado", request.url)
    )
  }

  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("id, clientId, clientSecret")
    .eq("ativo", true)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config) {
    return NextResponse.redirect(
      new URL("/configuracoes/google-agenda?erro=sem_config", request.url)
    )
  }

  try {
    const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret, REDIRECT_URI)
    const { tokens } = await oauth2.getToken(code)

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/configuracoes/google-agenda?erro=sem_refresh_token", request.url)
      )
    }

    await supabaseAdmin
      .from("config_google_calendar")
      .update({ refreshToken: tokens.refresh_token, atualizadoEm: agora() })
      .eq("id", config.id)

    return NextResponse.redirect(
      new URL("/configuracoes/google-agenda?conectado=true", request.url)
    )
  } catch {
    return NextResponse.redirect(
      new URL("/configuracoes/google-agenda?erro=falha_token", request.url)
    )
  }
}
