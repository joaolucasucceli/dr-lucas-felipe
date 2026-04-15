import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  const recebido = req.headers.get("x-admin-secret")
  return recebido === secret
}

async function auditar() {
  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      tipo: true,
      ativo: true,
    },
    orderBy: { criadoEm: "asc" },
  })

  const counts = {
    leads: await prisma.lead.count(),
    mensagensWhatsapp: await prisma.mensagemWhatsapp.count(),
    conversas: await prisma.conversa.count(),
    agendamentos: await prisma.agendamento.count(),
    procedimentos: await prisma.procedimento.count(),
    fotosLead: await prisma.fotoLead.count(),
    pacientes: await prisma.paciente.count(),
    prontuarios: await prisma.prontuario.count(),
    anamneses: await prisma.anamnese.count(),
    evolucoes: await prisma.evolucao.count(),
    documentosProntuario: await prisma.documentoProntuario.count(),
    fotosProntuario: await prisma.fotoProntuario.count(),
    agendamentosPaciente: await prisma.agendamentoPaciente.count(),
    sinaisVitais: await prisma.sinalVital.count(),
    registrosCirurgicos: await prisma.registroCirurgico.count(),
    auditLogs: await prisma.auditLog.count(),
    tiposProcedimento: await prisma.tipoProcedimento.count(),
    baseConhecimento: await prisma.baseConhecimento.count(),
    sprints: await prisma.sprint.count(),
    sprintItems: await prisma.sprintItem.count(),
    configSite: await prisma.configSite.count(),
    configGoogleCalendar: await prisma.configGoogleCalendar.count(),
    configWhatsapp: await prisma.configWhatsapp.count(),
  }

  return { usuarios, counts }
}

async function historicoRecente(limite: number) {
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      nome: true,
      whatsapp: true,
      statusFunil: true,
      sobreOPaciente: true,
      origem: true,
      criadoEm: true,
      atualizadoEm: true,
      conversas: {
        select: {
          id: true,
          etapa: true,
          modoConversa: true,
          ultimaMensagemEm: true,
          mensagens: {
            select: {
              id: true,
              tipo: true,
              conteudo: true,
              remetente: true,
              criadoEm: true,
              messageIdWhatsapp: true,
            },
            orderBy: { criadoEm: "asc" },
          },
        },
        orderBy: { criadoEm: "desc" },
        take: 1,
      },
      agendamentos: {
        select: {
          id: true,
          dataHora: true,
          status: true,
          googleEventId: true,
          criadoEm: true,
        },
        orderBy: { criadoEm: "desc" },
      },
    },
    orderBy: { atualizadoEm: "desc" },
    take: limite,
  })
  return { leads }
}

export async function GET(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }
  const url = new URL(req.url)
  const modo = url.searchParams.get("modo") || "auditoria"

  if (modo === "historico") {
    const limite = Number(url.searchParams.get("limite") || "5")
    const data = await historicoRecente(limite)
    return NextResponse.json(data)
  }

  const data = await auditar()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const url = new URL(req.url)
  const confirmar = url.searchParams.get("confirmar") === "true"
  const manterIdsParam = url.searchParams.get("manterIds") || ""
  const manterIds = manterIdsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (!confirmar) {
    return NextResponse.json({ error: "Falta confirmar=true" }, { status: 400 })
  }
  if (manterIds.length === 0) {
    return NextResponse.json(
      { error: "Falta manterIds=id1,id2,id3" },
      { status: 400 }
    )
  }

  const usuariosManter = await prisma.usuario.findMany({
    where: { id: { in: manterIds } },
    select: { id: true, nome: true, email: true, perfil: true, tipo: true },
  })

  if (usuariosManter.length !== manterIds.length) {
    return NextResponse.json(
      {
        error: "Algum manterIds nao existe",
        encontrados: usuariosManter.map((u) => u.id),
        solicitados: manterIds,
      },
      { status: 400 }
    )
  }

  const deletados: Record<string, number> = {}

  deletados.sinaisVitais = (await prisma.sinalVital.deleteMany({})).count
  deletados.registrosCirurgicos = (await prisma.registroCirurgico.deleteMany({})).count
  deletados.fotosProntuario = (await prisma.fotoProntuario.deleteMany({})).count
  deletados.documentosProntuario = (await prisma.documentoProntuario.deleteMany({})).count
  deletados.evolucoes = (await prisma.evolucao.deleteMany({})).count
  deletados.anamneses = (await prisma.anamnese.deleteMany({})).count
  deletados.agendamentosPaciente = (await prisma.agendamentoPaciente.deleteMany({})).count
  deletados.prontuarios = (await prisma.prontuario.deleteMany({})).count
  deletados.pacientes = (await prisma.paciente.deleteMany({})).count

  deletados.fotosLead = (await prisma.fotoLead.deleteMany({})).count
  deletados.mensagensWhatsapp = (await prisma.mensagemWhatsapp.deleteMany({})).count
  deletados.conversas = (await prisma.conversa.deleteMany({})).count
  deletados.procedimentos = (await prisma.procedimento.deleteMany({})).count
  deletados.agendamentos = (await prisma.agendamento.deleteMany({})).count
  deletados.leads = (await prisma.lead.deleteMany({})).count

  deletados.auditLogs = (await prisma.auditLog.deleteMany({})).count

  deletados.usuarios = (
    await prisma.usuario.deleteMany({
      where: { id: { notIn: manterIds } },
    })
  ).count

  const depois = await auditar()

  return NextResponse.json({
    ok: true,
    usuariosMantidos: usuariosManter,
    deletados,
    estadoAtual: depois,
  })
}
