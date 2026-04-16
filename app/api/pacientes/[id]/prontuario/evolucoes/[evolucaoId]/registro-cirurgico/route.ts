import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import {
  criarRegistroCirurgicoSchema,
  atualizarRegistroCirurgicoSchema,
} from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"
import { criarId, agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string; evolucaoId: string }> }

async function buscarEvolucao(pacienteId: string, evolucaoId: string) {
  const { data: paciente } = await supabaseAdmin
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .is("deletadoEm", null)
    .maybeSingle()
  if (!paciente) return null

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select("id")
    .eq("pacienteId", pacienteId)
    .maybeSingle()
  if (!prontuario) return null

  const { data: evolucao } = await supabaseAdmin
    .from("evolucoes")
    .select("id, tipo, registroCirurgico:registros_cirurgicos(*)")
    .eq("id", evolucaoId)
    .eq("prontuarioId", prontuario.id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!evolucao) return null

  const registroRaw = evolucao.registroCirurgico as unknown
  let registroCirurgico: Record<string, unknown> | null = null
  if (Array.isArray(registroRaw)) {
    registroCirurgico = (registroRaw[0] as Record<string, unknown>) ?? null
  } else if (registroRaw && typeof registroRaw === "object") {
    registroCirurgico = registroRaw as Record<string, unknown>
  }

  return {
    id: evolucao.id,
    tipo: evolucao.tipo,
    registroCirurgico,
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const evolucao = await buscarEvolucao(id, evolucaoId)

  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  return NextResponse.json({ dados: evolucao.registroCirurgico })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const body = await request.json()
  const parsed = criarRegistroCirurgicoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const evolucao = await buscarEvolucao(id, evolucaoId)
  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  if (evolucao.tipo !== "procedimento") {
    return NextResponse.json(
      { error: "Registro cirúrgico só pode ser vinculado a evolução tipo 'procedimento'" },
      { status: 400 }
    )
  }

  if (evolucao.registroCirurgico) {
    return NextResponse.json(
      { error: "Esta evolução já possui um registro cirúrgico" },
      { status: 409 }
    )
  }

  const { marcosRecuperacao, ...resto } = parsed.data

  const insertData = {
    id: criarId(),
    atualizadoEm: agora(),
    evolucaoId,
    ...resto,
    marcosRecuperacao: marcosRecuperacao ?? null,
  } as never

  const { data: registro, error } = await supabaseAdmin
    .from("registros_cirurgicos")
    .insert(insertData)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "RegistroCirurgico",
    entidadeId: registro.id,
    dadosDepois: registro as unknown as Record<string, unknown>,
  })

  return NextResponse.json(registro, { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const body = await request.json()
  const parsed = atualizarRegistroCirurgicoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const evolucao = await buscarEvolucao(id, evolucaoId)
  if (!evolucao || !evolucao.registroCirurgico) {
    return NextResponse.json({ error: "Registro cirúrgico não encontrado" }, { status: 404 })
  }

  const registroAtual = evolucao.registroCirurgico as { id: string }

  const { marcosRecuperacao, ...resto } = parsed.data

  const dadosUpdate: Record<string, unknown> = { ...resto, atualizadoEm: agora() }
  if (marcosRecuperacao !== undefined) {
    dadosUpdate.marcosRecuperacao = marcosRecuperacao
  }

  const { data: registro, error } = await supabaseAdmin
    .from("registros_cirurgicos")
    .update(dadosUpdate)
    .eq("id", registroAtual.id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "RegistroCirurgico",
    entidadeId: registro.id,
    dadosAntes: evolucao.registroCirurgico as unknown as Record<string, unknown>,
    dadosDepois: registro as unknown as Record<string, unknown>,
  })

  return NextResponse.json(registro)
}
