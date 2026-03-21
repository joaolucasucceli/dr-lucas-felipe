import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { configGoogleSchema } from "@/lib/validations/config-google"

export async function GET(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const config = await prisma.configGoogleCalendar.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  })

  if (!config) {
    return NextResponse.json({ configurado: false, config: null })
  }

  return NextResponse.json({
    configurado: true,
    config: {
      id: config.id,
      clientId: config.clientId,
      clientSecret: "••••••••" + config.clientSecret.slice(-4),
      conectado: !!config.refreshToken,
      ativo: config.ativo,
      atualizadoEm: config.atualizadoEm,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = configGoogleSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existente = await prisma.configGoogleCalendar.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  })

  let config
  if (existente) {
    config = await prisma.configGoogleCalendar.update({
      where: { id: existente.id },
      data: parsed.data,
    })
  } else {
    config = await prisma.configGoogleCalendar.create({
      data: parsed.data,
    })
  }

  return NextResponse.json({ sucesso: true, configurado: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const config = await prisma.configGoogleCalendar.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  })

  if (!config) {
    return NextResponse.json({ error: "Nenhuma configuração ativa" }, { status: 404 })
  }

  await prisma.configGoogleCalendar.update({
    where: { id: config.id },
    data: { ativo: false },
  })

  return NextResponse.json({ sucesso: true, configurado: false })
}
