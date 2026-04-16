import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, requireAnyRole } from "@/lib/auth-helpers"
import { criarEvento } from "@/lib/google-calendar"
import { criarId, agora } from "@/lib/db-utils"

const SELECT_AGENDAMENTO =
  "*, lead:leads!agendamentos_leadId_fkey(nome, whatsapp), procedimento:procedimentos(nome)"

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

  let query = supabaseAdmin
    .from("agendamentos")
    .select(SELECT_AGENDAMENTO, { count: "exact" })

  if (leadId) query = query.eq("leadId", leadId)
  if (status) query = query.eq("status", status as never)
  if (dataInicio) query = query.gte("dataHora", new Date(dataInicio).toISOString())
  if (dataFim) query = query.lte("dataHora", new Date(dataFim).toISOString())

  const inicio = (pagina - 1) * porPagina
  const fim = inicio + porPagina - 1

  const { data, count, error } = await query
    .order("dataHora", { ascending: false })
    .range(inicio, fim)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total = count ?? 0

  return NextResponse.json({
    dados: data ?? [],
    total,
    pagina,
    totalPaginas: Math.ceil(total / porPagina),
  })
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

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("nome, email")
    .eq("id", leadId)
    .maybeSingle()

  let procedimento: { nome: string } | null = null
  if (procedimentoId) {
    const { data } = await supabaseAdmin
      .from("procedimentos")
      .select("nome")
      .eq("id", procedimentoId)
      .maybeSingle()
    procedimento = data
  }

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

  const { data: agendamento, error } = await supabaseAdmin
    .from("agendamentos")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      leadId,
      procedimentoId: procedimentoId || null,
      dataHora: inicio.toISOString(),
      duracao: duracao ?? 60,
      observacao: observacao || null,
      googleEventId: googleEventId || null,
      googleEventUrl: googleEventUrl || null,
      sincronizado,
    })
    .select(SELECT_AGENDAMENTO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(agendamento, { status: 201 })
}
