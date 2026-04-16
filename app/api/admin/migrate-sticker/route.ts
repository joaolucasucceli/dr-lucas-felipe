import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 30

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  return req.headers.get("x-admin-secret") === secret
}

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  // Aplica migration 20260416120000_add_sticker_tipo_mensagem manualmente.
  // Postgres nao aceita ALTER TYPE dentro de transaction — rodamos solto.
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "TipoMensagem" ADD VALUE IF NOT EXISTS 'sticker';`
  )

  return NextResponse.json({ ok: true, aplicado: "TipoMensagem.sticker" })
}
