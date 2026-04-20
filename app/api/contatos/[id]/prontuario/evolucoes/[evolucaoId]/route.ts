import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarEvolucaoSchema } from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string; evolucaoId: string }> }

async function buscarEvolucao(pacienteId: string, evolucaoId: string) {
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
  if (!prontuario) return null

  const { data: evolucao } = await supabaseAdmin
    .from("evolucoes")
    .select("*, procedimento:procedimentos(id, nome)")
    .eq("id", evolucaoId)
    .eq("prontuarioId", prontuario.id)
    .is("deletadoEm", null)
    .maybeSingle()

  return evolucao
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const evolucao = await buscarEvolucao(id, evolucaoId)

  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  return NextResponse.json(evolucao)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params
  const body = await request.json()
  const parsed = atualizarEvolucaoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const evolucaoAtual = await buscarEvolucao(id, evolucaoId)
  if (!evolucaoAtual) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  const { dataRegistro, ...resto } = parsed.data

  const dadosUpdate: Record<string, unknown> = { ...resto, atualizadoEm: agora() }
  if (dataRegistro) {
    dadosUpdate.dataRegistro = new Date(dataRegistro).toISOString()
  }

  const { data: evolucaoAtualizada, error } = await supabaseAdmin
    .from("evolucoes")
    .update(dadosUpdate)
    .eq("id", evolucaoId)
    .select("*, procedimento:procedimentos(id, nome)")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "Evolucao",
    entidadeId: evolucaoId,
    dadosAntes: evolucaoAtual as unknown as Record<string, unknown>,
    dadosDepois: evolucaoAtualizada as unknown as Record<string, unknown>,
  })

  return NextResponse.json(evolucaoAtualizada)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id, evolucaoId } = await params

  const evolucao = await buscarEvolucao(id, evolucaoId)
  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("evolucoes")
    .update({ deletadoEm: agora(), atualizadoEm: agora() })
    .eq("id", evolucaoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "Evolucao",
    entidadeId: evolucaoId,
    dadosAntes: evolucao as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ mensagem: "Evolução removida" })
}
