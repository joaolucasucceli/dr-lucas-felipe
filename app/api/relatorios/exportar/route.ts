import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

function escapeCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  const str = String(valor)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function linhasCsv(cabecalho: string[], linhas: unknown[][]): string {
  const header = cabecalho.join(",")
  const rows = linhas.map((l) => l.map(escapeCsv).join(","))
  return [header, ...rows].join("\n")
}

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const tipo = searchParams.get("tipo") as "leads" | "agendamentos" | "conversas" | null
  const formato = searchParams.get("formato") || "csv"
  const agora = new Date()
  const dataInicio = searchParams.get("dataInicio")
    ? new Date(searchParams.get("dataInicio")!)
    : undefined
  const dataFim = searchParams.get("dataFim")
    ? new Date(searchParams.get("dataFim")!)
    : agora

  if (!tipo || !["leads", "agendamentos", "conversas"].includes(tipo)) {
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 })
  }

  const dataStr = agora.toISOString().slice(0, 10)
  let conteudo: string
  let contentType: string

  if (tipo === "leads") {
    const where = {
      deletadoEm: null,
      ...(dataInicio ? { criadoEm: { gte: dataInicio, lte: dataFim } } : {}),
    }
    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        email: true,
        origem: true,
        statusFunil: true,
        procedimentoInteresse: true,
        criadoEm: true,
        atualizadoEm: true,
      },
      orderBy: { criadoEm: "desc" },
    })

    if (formato === "json") {
      conteudo = JSON.stringify(leads, null, 2)
      contentType = "application/json"
    } else {
      conteudo = linhasCsv(
        ["id", "nome", "whatsapp", "email", "origem", "statusFunil", "procedimentoInteresse", "criadoEm", "atualizadoEm"],
        leads.map((l) => [l.id, l.nome, l.whatsapp, l.email, l.origem, l.statusFunil, l.procedimentoInteresse, l.criadoEm.toISOString(), l.atualizadoEm.toISOString()])
      )
      contentType = "text/csv"
    }
  } else if (tipo === "agendamentos") {
    const where = dataInicio ? { criadoEm: { gte: dataInicio, lte: dataFim } } : {}
    const agendamentos = await prisma.agendamento.findMany({
      where,
      select: {
        id: true,
        lead: { select: { nome: true, whatsapp: true } },
        procedimento: { select: { nome: true } },
        dataHora: true,
        duracao: true,
        status: true,
        criadoEm: true,
      },
      orderBy: { dataHora: "desc" },
    })

    if (formato === "json") {
      conteudo = JSON.stringify(agendamentos, null, 2)
      contentType = "application/json"
    } else {
      conteudo = linhasCsv(
        ["id", "leadNome", "leadWhatsapp", "procedimento", "dataHora", "duracao", "status", "criadoEm"],
        agendamentos.map((a) => [
          a.id,
          a.lead.nome,
          a.lead.whatsapp,
          a.procedimento?.nome ?? "",
          a.dataHora.toISOString(),
          a.duracao,
          a.status,
          a.criadoEm.toISOString(),
        ])
      )
      contentType = "text/csv"
    }
  } else {
    // conversas
    const where = dataInicio ? { criadoEm: { gte: dataInicio, lte: dataFim } } : {}
    const conversas = await prisma.conversa.findMany({
      where,
      select: {
        id: true,
        lead: { select: { nome: true, whatsapp: true } },
        _count: { select: { mensagens: true } },
        atualizadoEm: true,
        encerradaEm: true,
      },
      orderBy: { atualizadoEm: "desc" },
    })

    if (formato === "json") {
      conteudo = JSON.stringify(conversas, null, 2)
      contentType = "application/json"
    } else {
      conteudo = linhasCsv(
        ["id", "leadNome", "leadWhatsapp", "totalMensagens", "ultimaMensagemEm", "encerradaEm"],
        conversas.map((c) => [
          c.id,
          c.lead.nome,
          c.lead.whatsapp,
          c._count.mensagens,
          c.atualizadoEm.toISOString(),
          c.encerradaEm?.toISOString() ?? "",
        ])
      )
      contentType = "text/csv"
    }
  }

  const ext = formato === "json" ? "json" : "csv"
  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="relatorio-${tipo}-${dataStr}.${ext}"`,
    },
  })
}
