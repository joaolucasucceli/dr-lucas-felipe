import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
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
  const agoraTs = new Date()
  const dataInicio = searchParams.get("dataInicio")
    ? new Date(searchParams.get("dataInicio")!)
    : undefined
  const dataFim = searchParams.get("dataFim")
    ? new Date(searchParams.get("dataFim")!)
    : agoraTs

  if (!tipo || !["leads", "agendamentos", "conversas"].includes(tipo)) {
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 })
  }

  const dataInicioIso = dataInicio?.toISOString()
  const dataFimIso = dataFim.toISOString()
  const dataStr = agoraTs.toISOString().slice(0, 10)
  let conteudo: string
  let contentType: string

  if (tipo === "leads") {
    let query = supabaseAdmin
      .from("contatos")
      .select(
        "id, nome, whatsapp, email, origem, statusFunil, procedimentoInteresse, criadoEm, atualizadoEm"
      )
      .is("deletadoEm", null)

    if (dataInicioIso) {
      query = query.gte("criadoEm", dataInicioIso).lte("criadoEm", dataFimIso)
    }

    const { data: leads } = await query.order("criadoEm", { ascending: false })

    if (formato === "json") {
      conteudo = JSON.stringify(leads ?? [], null, 2)
      contentType = "application/json"
    } else {
      conteudo = linhasCsv(
        ["id", "nome", "whatsapp", "email", "origem", "statusFunil", "procedimentoInteresse", "criadoEm", "atualizadoEm"],
        (leads ?? []).map((l) => [
          l.id,
          l.nome,
          l.whatsapp,
          l.email,
          l.origem,
          l.statusFunil,
          l.procedimentoInteresse,
          l.criadoEm,
          l.atualizadoEm,
        ])
      )
      contentType = "text/csv"
    }
  } else if (tipo === "agendamentos") {
    let query = supabaseAdmin
      .from("agendamentos")
      .select(
        "id, dataHora, duracao, status, criadoEm, lead:leads!agendamentos_contatoId_fkey(nome, whatsapp), procedimento:procedimentos(nome)"
      )

    if (dataInicioIso) {
      query = query.gte("criadoEm", dataInicioIso).lte("criadoEm", dataFimIso)
    }

    const { data: agendamentos } = await query.order("dataHora", { ascending: false })

    if (formato === "json") {
      conteudo = JSON.stringify(agendamentos ?? [], null, 2)
      contentType = "application/json"
    } else {
      conteudo = linhasCsv(
        ["id", "leadNome", "leadWhatsapp", "procedimento", "dataHora", "duracao", "status", "criadoEm"],
        (agendamentos ?? []).map((a) => {
          const lead = a.lead as unknown as { nome: string; whatsapp: string } | null
          const proc = a.procedimento as unknown as { nome: string } | null
          return [
            a.id,
            lead?.nome ?? "",
            lead?.whatsapp ?? "",
            proc?.nome ?? "",
            a.dataHora,
            a.duracao,
            a.status,
            a.criadoEm,
          ]
        })
      )
      contentType = "text/csv"
    }
  } else {
    let query = supabaseAdmin
      .from("conversas")
      .select(
        "id, atualizadoEm, encerradaEm, criadoEm, lead:leads!conversas_contatoId_fkey(nome, whatsapp), mensagens:mensagens_whatsapp(id)"
      )

    if (dataInicioIso) {
      query = query.gte("criadoEm", dataInicioIso).lte("criadoEm", dataFimIso)
    }

    const { data: conversas } = await query.order("atualizadoEm", { ascending: false })

    type ConversaExport = {
      id: string
      atualizadoEm: string
      encerradaEm: string | null
      lead: { nome: string; whatsapp: string } | null
      mensagens: Array<{ id: string }>
    }

    const lista = ((conversas ?? []) as unknown as ConversaExport[]).map((c) => ({
      id: c.id,
      leadNome: c.lead?.nome ?? "",
      leadWhatsapp: c.lead?.whatsapp ?? "",
      totalMensagens: c.mensagens?.length ?? 0,
      atualizadoEm: c.atualizadoEm,
      encerradaEm: c.encerradaEm,
    }))

    if (formato === "json") {
      conteudo = JSON.stringify(lista, null, 2)
      contentType = "application/json"
    } else {
      conteudo = linhasCsv(
        ["id", "leadNome", "leadWhatsapp", "totalMensagens", "ultimaMensagemEm", "encerradaEm"],
        lista.map((c) => [
          c.id,
          c.leadNome,
          c.leadWhatsapp,
          c.totalMensagens,
          c.atualizadoEm,
          c.encerradaEm ?? "",
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
