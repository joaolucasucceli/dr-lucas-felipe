import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { configWhatsappSchema } from "@/lib/validations/whatsapp-config"
import { listarInstancias } from "@/lib/uazapi"

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

  // Validar admin token via endpoint admin (GET /admin/users)
  const resultado = await listarInstancias(uazapiUrl, adminToken)
  if (!resultado.ok) {
    console.error("[test-connection] Falha ao conectar ao Uazapi:", resultado.erro)
    return NextResponse.json(
      { error: "Não foi possível conectar ao Uazapi.", detalhe: resultado.erro },
      { status: 400 }
    )
  }

  // Verificar se já existe instância criada — salvar instance token se encontrar
  const instanciaExistente = resultado.instancias?.find((i) => i.Token)
  const instanceToken = instanciaExistente?.Token || null

  // Upsert config
  const existente = await prisma.configWhatsapp.findFirst({
    orderBy: { criadoEm: "desc" },
  })

  const dados = {
    uazapiUrl,
    adminToken,
    ...(instanceToken ? { instanceToken } : {}),
  }

  if (existente) {
    await prisma.configWhatsapp.update({
      where: { id: existente.id },
      data: dados,
    })
  } else {
    await prisma.configWhatsapp.create({
      data: { uazapiUrl, adminToken, instanceToken: instanceToken || adminToken },
    })
  }

  return NextResponse.json({ sucesso: true })
}
