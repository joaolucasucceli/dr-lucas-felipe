import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAnyRole } from "@/lib/auth-helpers"
import { criarEvento } from "@/lib/google-calendar"

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = req.nextUrl
  const leadId = searchParams.get("leadId") || undefined
  const status = searchParams.get("status") || undefined
  const dataInicio = searchParams.get("dataInicio") || undefined
  const dataFim = searchParams.get("dataFim") || undefined
  const pagina = Math.max(1, Number(searchParams.get("pagina") || "1"))
  const porPagina = Math.min(100, Math.max(1, Number(searchParams.get("porPagina") || "20")))

  const where = {
    ...(leadId && { leadId }),
    ...(status && { status: status as never }),
    ...(dataInicio || dataFim
      ? {
          dataHora: {
            ...(dataInicio && { gte: new Date(dataInicio) }),
            ...(dataFim && { lte: new Date(dataFim) }),
          },
        }
      : {}),
  }

  const [total, dados] = await Promise.all([
    prisma.agendamento.count({ where }),
    prisma.agendamento.findMany({
      where,
      include: {
        lead: { select: { nome: true, whatsapp: true } },
        procedimento: { select: { nome: true } },
      },
      orderBy: { dataHora: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])

  return NextResponse.json({ dados, total, pagina, totalPaginas: Math.ceil(total / porPagina) })
}

export async function POST(req: NextRequest) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const leadId = body.leadId as string | undefined
  const procedimentoId = body.procedimentoId as string | undefined
  const dataHora = body.dataHora as string | undefined
  const duracao = body.duracao as number | undefined
  const observacao = body.observacao as string | undefined

  if (!leadId || !dataHora) {
    return NextResponse.json({ error: "leadId e dataHora são obrigatórios" }, { status: 400 })
  }

  const inicio = new Date(dataHora)
  const fim = new Date(inicio.getTime() + (duracao ?? 60) * 60 * 1000)

  let googleEventId: string | undefined
  let googleEventUrl: string | undefined
  let sincronizado = false

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { nome: true, email: true } })
  const procedimento = procedimentoId
    ? await prisma.procedimento.findUnique({ where: { id: procedimentoId }, select: { nome: true } })
    : null

  const resultado = await criarEvento({
    titulo: `Consulta — ${lead?.nome || "Paciente"}${procedimento ? ` (${procedimento.nome})` : ""}`,
    descricao: observacao,
    inicio,
    fim,
    emailPaciente: lead?.email || undefined,
  }).catch((err) => {
    console.warn("[agendamentos] Falha ao criar evento no Google Calendar:", err)
    return null
  })

  if (resultado) {
    googleEventId = resultado.googleEventId
    googleEventUrl = resultado.googleEventUrl
    sincronizado = true
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      leadId,
      procedimentoId: procedimentoId || null,
      dataHora: inicio,
      duracao: duracao ?? 60,
      observacao: observacao || null,
      googleEventId: googleEventId || null,
      googleEventUrl: googleEventUrl || null,
      sincronizado,
    },
    include: {
      lead: { select: { nome: true, whatsapp: true } },
      procedimento: { select: { nome: true } },
    },
  })

  return NextResponse.json(agendamento, { status: 201 })
}
