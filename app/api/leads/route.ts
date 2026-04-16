import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, requireAnyRole } from "@/lib/auth-helpers"
import { criarLeadSchema } from "@/lib/validations/lead"
import { criarId, agora } from "@/lib/db-utils"

const SELECT_LEAD =
  "id, nome, whatsapp, email, procedimentoInteresse, statusFunil, origem, arquivado, criadoEm, responsavel:usuarios!leads_responsavelId_fkey(id, nome)"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const pagina = Number(searchParams.get("pagina") || "1")
  const porPagina = Number(searchParams.get("porPagina") || "10")
  const statusFunil = searchParams.get("statusFunil")
  const procedimentoInteresse = searchParams.get("procedimentoInteresse")
  const responsavelId = searchParams.get("responsavelId")
  const origem = searchParams.get("origem")
  const arquivado = searchParams.get("arquivado")
  const busca = searchParams.get("busca")
  const alerta = searchParams.get("alerta") === "true"

  let query = supabaseAdmin
    .from("leads")
    .select(SELECT_LEAD, { count: "exact" })
    .is("deletadoEm", null)
    .eq("arquivado", arquivado === "true")

  if (statusFunil) query = query.eq("statusFunil", statusFunil as never)
  if (procedimentoInteresse) query = query.eq("procedimentoInteresse", procedimentoInteresse)
  if (responsavelId) query = query.eq("responsavelId", responsavelId)
  if (origem) query = query.eq("origem", origem)
  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,whatsapp.ilike.%${busca}%`)
  }
  if (alerta) {
    const ha3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    query = query
      .not("statusFunil", "in", "(concluido,perdido)")
      .or(`ultimaMovimentacaoEm.lt.${ha3dias},and(ultimaMovimentacaoEm.is.null,atualizadoEm.lt.${ha3dias})`)
  }

  const inicio = (pagina - 1) * porPagina
  const fim = inicio + porPagina - 1

  const { data, count, error } = await query
    .order("criadoEm", { ascending: false })
    .range(inicio, fim)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    dados: data ?? [],
    total: count ?? 0,
    pagina,
    porPagina,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarLeadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { whatsapp } = parsed.data

  const { data: existente } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("whatsapp", whatsapp)
    .maybeSingle()

  if (existente) {
    return NextResponse.json(
      { error: "WhatsApp já cadastrado" },
      { status: 409 }
    )
  }

  const insertData = {
    id: criarId(),
    atualizadoEm: agora(),
    ...parsed.data,
  } as never

  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .insert(insertData)
    .select(
      "id, nome, whatsapp, email, procedimentoInteresse, statusFunil, origem, criadoEm"
    )
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(lead, { status: 201 })
}
