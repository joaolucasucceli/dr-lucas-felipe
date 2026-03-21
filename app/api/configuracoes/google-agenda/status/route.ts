import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const config = await prisma.configGoogleCalendar.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
    select: { refreshToken: true },
  })

  return NextResponse.json({
    configurado: !!config,
    conectado: !!(config?.refreshToken),
  })
}
