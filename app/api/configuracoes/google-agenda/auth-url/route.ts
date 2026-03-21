import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { google } from "googleapis"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

const REDIRECT_URI = "https://drlucasfelipe.vercel.app/api/configuracoes/google-agenda/callback"

export async function GET(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const config = await prisma.configGoogleCalendar.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  })

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
