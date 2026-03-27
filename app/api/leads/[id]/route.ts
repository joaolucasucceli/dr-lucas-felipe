import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAnyRole, requireRole } from "@/lib/auth-helpers"
import { atualizarLeadSchema } from "@/lib/validations/lead"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id, deletadoEm: null },
    include: {
      responsavel: {
        select: { id: true, nome: true },
      },
      agendamentos: {
        orderBy: { dataHora: "desc" },
        include: {
          procedimento: {
            select: { id: true, nome: true },
          },
        },
      },
      conversas: {
        orderBy: [{ ciclo: "desc" }, { atualizadoEm: "desc" }],
        include: {
          mensagens: {
            orderBy: { criadoEm: "asc" },
          },
        },
      },
      fotos: {
        orderBy: { criadoEm: "desc" },
      },
      paciente: {
        select: { id: true, nome: true },
      },
    },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  return NextResponse.json(lead)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarLeadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const leadAtual = await prisma.lead.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!leadAtual) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const dados = { ...parsed.data }

  // sobreOPaciente: APPEND, nunca overwrite
  if (dados.sobreOPaciente) {
    const textoAtual = leadAtual.sobreOPaciente || ""
    dados.sobreOPaciente = textoAtual
      ? `${textoAtual}\n---\n${dados.sobreOPaciente}`
      : dados.sobreOPaciente
  }

  // Se whatsapp mudou, verificar unicidade
  if (dados.whatsapp && dados.whatsapp !== leadAtual.whatsapp) {
    const existente = await prisma.lead.findUnique({
      where: { whatsapp: dados.whatsapp },
    })
    if (existente) {
      return NextResponse.json({ error: "WhatsApp já cadastrado" }, { status: 409 })
    }
  }

  const leadAtualizado = await prisma.lead.update({
    where: { id },
    data: dados,
    select: {
      id: true,
      nome: true,
      whatsapp: true,
      email: true,
      procedimentoInteresse: true,
      statusFunil: true,
      origem: true,
      sobreOPaciente: true,
      responsavelId: true,
      arquivado: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  })


  return NextResponse.json(leadAtualizado)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id, deletadoEm: null },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  await prisma.lead.update({
    where: { id },
    data: {
      deletadoEm: new Date(),
    },
  })

  return NextResponse.json({ mensagem: "Lead removido" })
}
