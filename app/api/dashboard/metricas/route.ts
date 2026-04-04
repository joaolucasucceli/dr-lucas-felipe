import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
const labelsFunil: Record<string, string> = {
  acolhimento: "Acolhimento",
  qualificacao: "Qualificação",
  agendamento: "Agendamento",
  consulta_agendada: "Consulta Agendada",
  consulta_realizada: "Consulta Realizada",
  sinal_pago: "Sinal Pago",
  procedimento_agendado: "Procedimento Agendado",
  concluido: "Concluído",
  perdido: "Perdido",
}

const coresFunil: Record<string, string> = {
  acolhimento: "#a1a1aa",
  qualificacao: "#93c5fd",
  agendamento: "#a5b4fc",
  consulta_agendada: "#c4b5fd",
  consulta_realizada: "#86efac",
  sinal_pago: "#6ee7b7",
  procedimento_agendado: "#fcd34d",
  concluido: "#bbf7d0",
  perdido: "#fca5a5",
}

const ordemFunil = [
  "acolhimento",
  "qualificacao",
  "agendamento",
  "consulta_agendada",
  "consulta_realizada",
  "sinal_pago",
  "procedimento_agendado",
  "concluido",
  "perdido",
]

const etapasConvertidas = [
  "consulta_agendada",
  "consulta_realizada",
  "sinal_pago",
  "procedimento_agendado",
  "concluido",
]

function calcularDataInicio(periodo: string): Date | null {
  const agora = new Date()

  if (periodo === "total") return null

  if (periodo === "hoje") {
    const spDate = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(agora)
    const [dia, mes, ano] = spDate.split("/")
    return new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`)
  }

  if (periodo === "semana") {
    return new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  // mes (default)
  return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const periodo =
    request.nextUrl.searchParams.get("periodo") || "mes"
  const dataInicio = calcularDataInicio(periodo)
  const dataFim = new Date()
  const ha3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  const filtroBase = { deletadoEm: null, arquivado: false }
  const filtroPeriodo = dataInicio
    ? { criadoEm: { gte: dataInicio } }
    : {}

  const spHoje = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const [diaH, mesH, anoH] = spHoje.split("/")
  const inicioHoje = new Date(`${anoH}-${mesH}-${diaH}T00:00:00-03:00`)
  const [
    totalLeads,
    leadsNovosNoPeriodo,
    leadsConvertidos,
    agendamentosNoPeriodo,
    agendamentosRealizados,
    leadsPorEtapaRaw,
    leadsPorOrigemRaw,
    mensagensEnviadasPelaIA,
    followUpsEnviados,
    confirmacaoEnviadas,
    leadsEmAlerta,
    pacientesRetorno,
    leadsHoje,
    agendamentosSemana,
  ] = await Promise.all([
    prisma.lead.count({ where: filtroBase }),
    prisma.lead.count({ where: { ...filtroBase, ...filtroPeriodo } }),
    prisma.lead.count({
      where: {
        ...filtroBase,
        statusFunil: { in: etapasConvertidas as never[] },
      },
    }),
    prisma.agendamento.count({
      where: dataInicio ? { criadoEm: { gte: dataInicio } } : {},
    }),
    prisma.agendamento.count({
      where: {
        status: "realizado",
        ...(dataInicio ? { criadoEm: { gte: dataInicio } } : {}),
      },
    }),
    prisma.lead.groupBy({
      by: ["statusFunil"],
      _count: { id: true },
      where: filtroBase,
    }),
    prisma.lead.groupBy({
      by: ["origem"],
      _count: { id: true },
      where: filtroBase,
    }),
    prisma.mensagemWhatsapp.count({
      where: {
        remetente: "agente",
        ...(dataInicio ? { criadoEm: { gte: dataInicio } } : {}),
      },
    }),
    prisma.conversa.count({
      where: {
        followUpEnviados: { isEmpty: false },
        ...(dataInicio ? { atualizadoEm: { gte: dataInicio } } : {}),
      },
    }),
    prisma.agendamento.count({
      where: {
        confirmacoesEnviadas: { isEmpty: false },
        ...(dataInicio ? { criadoEm: { gte: dataInicio } } : {}),
      },
    }),
    prisma.lead.count({
      where: {
        ...filtroBase,
        statusFunil: { notIn: ["concluido", "perdido"] as never[] },
        OR: [
          { ultimaMovimentacaoEm: { not: null, lt: ha3dias } },
          { ultimaMovimentacaoEm: null, atualizadoEm: { lt: ha3dias } },
        ],
      },
    }),
    prisma.lead.count({
      where: { ...filtroBase, ehRetorno: true },
    }),
    prisma.lead.count({
      where: { ...filtroBase, criadoEm: { gte: inicioHoje } },
    }),
    prisma.agendamento.count({
      where: {
        status: { not: "cancelado" },
        dataHora: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const taxaConversao =
    totalLeads > 0
      ? Math.round((leadsConvertidos / totalLeads) * 1000) / 10
      : 0

  const leadsPorEtapa = ordemFunil.map((etapa) => {
    const encontrado = leadsPorEtapaRaw.find(
      (g) => g.statusFunil === etapa
    )
    return {
      etapa,
      label: labelsFunil[etapa] || etapa,
      total: encontrado?._count?.id ?? 0,
      cor: coresFunil[etapa] || "#94a3b8",
    }
  })

  const leadsPorOrigem = leadsPorOrigemRaw.map((g) => ({
    origem: g.origem || "Não informada",
    total: g._count?.id ?? 0,
  }))

  const taxaRetorno =
    totalLeads > 0
      ? Math.round((pacientesRetorno / totalLeads) * 1000) / 10
      : 0

  const isAtendente = session!.user.perfil === "atendente"

  return NextResponse.json({
    totalLeads,
    leadsNovosNoPeriodo,
    taxaConversao,
    agendamentosNoPeriodo,
    agendamentosRealizados,
    leadsPorEtapa,
    leadsPorOrigem,
    mensagensEnviadasPelaIA: isAtendente ? 0 : mensagensEnviadasPelaIA,
    followUpsEnviados: isAtendente ? 0 : followUpsEnviados,
    confirmacaoEnviadas: isAtendente ? 0 : confirmacaoEnviadas,
    leadsEmAlerta,
    pacientesRetorno,
    taxaRetorno,
    leadsHoje,
    agendamentosSemana,
    periodo,
    dataInicio: dataInicio?.toISOString() ?? null,
    dataFim: dataFim.toISOString(),
  })
}
