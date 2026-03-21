import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { configWhatsappSchema } from "@/lib/validations/whatsapp-config"
import { testarConexao } from "@/lib/uazapi"

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = configWhatsappSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { uazapiUrl, adminToken } = parsed.data

  // Testar conexão com Uazapi v2 (adminToken é o instance token)
  const resultado = await testarConexao(uazapiUrl, adminToken)
  if (!resultado.ok) {
    console.error("[test-connection] Falha ao conectar ao Uazapi:", resultado.erro)
    return NextResponse.json(
      { error: "Não foi possível conectar ao Uazapi.", detalhe: resultado.erro },
      { status: 400 }
    )
  }

  // Upsert config — na v2, adminToken e instanceToken são o mesmo
  const existente = await prisma.configWhatsapp.findFirst({
    orderBy: { criadoEm: "desc" },
  })

  if (existente) {
    await prisma.configWhatsapp.update({
      where: { id: existente.id },
      data: { uazapiUrl, adminToken, instanceToken: adminToken },
    })
  } else {
    await prisma.configWhatsapp.create({
      data: { uazapiUrl, adminToken, instanceToken: adminToken },
    })
  }

  return NextResponse.json({ sucesso: true })
}
