import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { google } from "googleapis"
import { prisma } from "@/lib/prisma"

const REDIRECT_URI = "https://drlucasfelipe.vercel.app/api/configuracoes/google-agenda/callback"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/configuracoes/google-agenda?erro=acesso_negado", request.url)
    )
  }

  const config = await prisma.configGoogleCalendar.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  })

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

    await prisma.configGoogleCalendar.update({
      where: { id: config.id },
      data: { refreshToken: tokens.refresh_token },
    })

    return NextResponse.redirect(
      new URL("/configuracoes/google-agenda?conectado=true", request.url)
    )
  } catch {
    return NextResponse.redirect(
      new URL("/configuracoes/google-agenda?erro=falha_token", request.url)
    )
  }
}
