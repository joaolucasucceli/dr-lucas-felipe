import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  return req.headers.get("x-admin-secret") === secret
}

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "fotoUrl" TEXT;`
  )
  return NextResponse.json({ ok: true, aplicado: "usuarios.fotoUrl" })
}
