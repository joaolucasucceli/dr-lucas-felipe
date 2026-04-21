import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

/** GET /api/agenda — lista consolidada de agendamentos com filtros de periodo/status.
 *  Usado pela pagina /agenda e para exibir proximos compromissos do Dr. Lucas.
 *  Query params:
 *    - periodo: "hoje" | "semana" | "mes" | "passado" (default: "semana")
 *    - status: csv de status (default: todos menos "cancelado")
 *    - dataInicio, dataFim: ISO (sobrescreve periodo se ambos presentes) */
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const periodo = searchParams.get("periodo") || "semana"
  const statusParam = searchParams.get("status")
  const dataInicioParam = searchParams.get("dataInicio")
  const dataFimParam = searchParams.get("dataFim")

  const agoraTs = new Date()

  let dataInicio: Date
  let dataFim: Date

  if (dataInicioParam && dataFimParam) {
    dataInicio = new Date(dataInicioParam)
    dataFim = new Date(dataFimParam)
  } else if (periodo === "hoje") {
    const spHoje = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(agoraTs)
    const [dia, mes, ano] = spHoje.split("/")
    dataInicio = new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`)
    dataFim = new Date(`${ano}-${mes}-${dia}T23:59:59-03:00`)
  } else if (periodo === "passado") {
    dataInicio = new Date(agoraTs.getTime() - 30 * 24 * 60 * 60 * 1000)
    dataFim = agoraTs
  } else if (periodo === "mes") {
    dataInicio = agoraTs
    dataFim = new Date(agoraTs.getTime() + 30 * 24 * 60 * 60 * 1000)
  } else {
    dataInicio = agoraTs
    dataFim = new Date(agoraTs.getTime() + 7 * 24 * 60 * 60 * 1000)
  }

  const statusList = statusParam
    ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
    : null

  let query = supabaseAdmin
    .from("agendamentos")
    .select(`
      id,
      dataHora,
      duracao,
      status,
      observacao,
      googleEventUrl,
      criadoEm,
      contato:contatos!agendamentos_contatoId_fkey(id, nome, whatsapp, tipo),
      procedimento:procedimentos(id, nome)
    `)
    .gte("dataHora", dataInicio.toISOString())
    .lte("dataHora", dataFim.toISOString())
    .order("dataHora", { ascending: true })

  if (statusList && statusList.length > 0) {
    query = query.in("status", statusList as never)
  } else {
    query = query.neq("status", "cancelado")
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    dados: data ?? [],
    periodo: {
      inicio: dataInicio.toISOString(),
      fim: dataFim.toISOString(),
      tipo: periodo,
    },
    total: data?.length ?? 0,
  })
}
