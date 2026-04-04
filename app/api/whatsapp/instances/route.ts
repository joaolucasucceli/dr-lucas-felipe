import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const instancias = await prisma.configWhatsapp.findMany({
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      nome: true,
      uazapiUrl: true,
      instanceId: true,
      numeroWhatsapp: true,
      webhookUrl: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  })

  return NextResponse.json({ instancias })
}
