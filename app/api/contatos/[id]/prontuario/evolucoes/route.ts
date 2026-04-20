import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarEvolucaoSchema } from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"
import { criarId, agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

const SELECT_EVOLUCAO =
  "*, procedimento:procedimentos(id, nome), registroCirurgico:registros_cirurgicos(*)"

async function buscarProntuario(pacienteId: string) {
  const { data: paciente } = await supabaseAdmin
    .from("contatos")
    .select("id")
    .eq("id", pacienteId)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente) return null

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select("id")
    .eq("contatoId", pacienteId)
    .maybeSingle()

  return prontuario
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get("tipo")
  const pagina = parseInt(searchParams.get("pagina") || "1")
  const porPagina = parseInt(searchParams.get("porPagina") || "20")

  const prontuario = await buscarProntuario(id)
  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  let query = supabaseAdmin
    .from("evolucoes")
    .select(SELECT_EVOLUCAO, { count: "exact" })
    .eq("prontuarioId", prontuario.id)
    .is("deletadoEm", null)

  if (tipo) {
    query = query.eq("tipo", tipo as never)
  }

  const inicio = (pagina - 1) * porPagina
  const fim = inicio + porPagina - 1

  const { data, count, error } = await query
    .order("dataRegistro", { ascending: false })
    .range(inicio, fim)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: data ?? [], total: count ?? 0 })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = criarEvolucaoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const prontuario = await buscarProntuario(id)
  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const { dataRegistro, ...resto } = parsed.data

  const insertData = {
    id: criarId(),
    atualizadoEm: agora(),
    prontuarioId: prontuario.id,
    ...resto,
    dataRegistro: dataRegistro ? new Date(dataRegistro).toISOString() : agora(),
  } as never

  const { data: evolucao, error } = await supabaseAdmin
    .from("evolucoes")
    .insert(insertData)
    .select(SELECT_EVOLUCAO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "Evolucao",
    entidadeId: evolucao.id,
    dadosDepois: evolucao as unknown as Record<string, unknown>,
  })

  return NextResponse.json(evolucao, { status: 201 })
}
