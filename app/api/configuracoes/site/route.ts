import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { configSiteSchema } from "@/lib/validations/config-site"

export async function GET(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const config = await prisma.configSite.findFirst({
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
      whatsappNumero: config.whatsappNumero,
      whatsappMensagem: config.whatsappMensagem,
      medicoNome: config.medicoNome,
      medicoEspecialidade: config.medicoEspecialidade,
      medicoCrm: config.medicoCrm,
      instagramUrl: config.instagramUrl,
      contatoTelefone: config.contatoTelefone,
      contatoEndereco: config.contatoEndereco,
      contatoCidade: config.contatoCidade,
      atualizadoEm: config.atualizadoEm,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = configSiteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existente = await prisma.configSite.findFirst({
    where: { ativo: true },
    orderBy: { criadoEm: "desc" },
  })

  if (existente) {
    await prisma.configSite.update({
      where: { id: existente.id },
      data: parsed.data,
    })
  } else {
    await prisma.configSite.create({
      data: parsed.data,
    })
  }

  return NextResponse.json({ sucesso: true, configurado: true })
}
