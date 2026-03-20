import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"
import { registrarAudit, getIpFromHeaders } from "@/lib/audit"
import { configWhatsappSchema } from "@/lib/validations/whatsapp-config"
import { testarConexao } from "@/lib/uazapi"

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
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

  // Testar conexão com Uazapi
  const conectou = await testarConexao(uazapiUrl, adminToken)
  if (!conectou) {
    return NextResponse.json(
      { error: "Não foi possível conectar ao Uazapi. Verifique URL e token." },
      { status: 400 }
    )
  }

  // Upsert config
  const existente = await prisma.configWhatsapp.findFirst({
    orderBy: { criadoEm: "desc" },
  })

  let config
  if (existente) {
    config = await prisma.configWhatsapp.update({
      where: { id: existente.id },
      data: { uazapiUrl, adminToken },
    })
  } else {
    config = await prisma.configWhatsapp.create({
      data: { uazapiUrl, adminToken },
    })
  }

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: existente ? "update" : "create",
    entidade: "ConfigWhatsapp",
    entidadeId: config.id,
    dadosDepois: { uazapiUrl },
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json({ sucesso: true })
}
