import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarSinalVitalSchema } from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"
import { criarId, agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

async function buscarProntuario(pacienteId: string) {
  const { data: paciente } = await supabaseAdmin
    .from("contatos")
    .select("id, tipo")
    .eq("id", pacienteId)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente || paciente.tipo !== "paciente") return null

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
  const limite = parseInt(searchParams.get("limite") || "50")

  const prontuario = await buscarProntuario(id)
  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  let query = supabaseAdmin
    .from("sinais_vitais")
    .select("*")
    .eq("prontuarioId", prontuario.id)

  if (tipo) {
    query = query.eq("tipo", tipo as never)
  }

  const { data, error } = await query
    .order("dataRegistro", { ascending: false })
    .limit(limite)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dados: data ?? [] })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = criarSinalVitalSchema.safeParse(body)

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
    prontuarioId: prontuario.id,
    ...resto,
    dataRegistro: dataRegistro ? new Date(dataRegistro).toISOString() : agora(),
  } as never

  const { data: sinal, error } = await supabaseAdmin
    .from("sinais_vitais")
    .insert(insertData)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "SinalVital",
    entidadeId: sinal.id,
    dadosDepois: sinal as unknown as Record<string, unknown>,
  })

  return NextResponse.json(sinal, { status: 201 })
}
