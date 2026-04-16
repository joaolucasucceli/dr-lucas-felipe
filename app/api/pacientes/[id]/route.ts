import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarPacienteSchema } from "@/lib/validations/paciente"
import { registrarAuditLog } from "@/lib/audit"
import { checkRateLimitPaciente, registrarTentativaPaciente } from "@/lib/rate-limit"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: paciente } = await supabaseAdmin
    .from("pacientes")
    .select(`
      *,
      prontuario:prontuarios(*, anamnese:anamneses(*)),
      agendamentos:agendamentos_paciente(*, procedimento:procedimentos(id, nome)),
      leadOrigem:leads!pacientes_leadOrigemId_fkey(id, nome, whatsapp)
    `)
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  type Prontuario = { id: string; anamnese: unknown }
  const prontuarioRaw = paciente.prontuario as unknown
  let prontuario: (Prontuario & { _count: { evolucoes: number; documentos: number; fotos: number } }) | null = null

  if (Array.isArray(prontuarioRaw) && prontuarioRaw.length > 0) {
    prontuario = prontuarioRaw[0] as Prontuario & { _count: { evolucoes: number; documentos: number; fotos: number } }
  } else if (prontuarioRaw && typeof prontuarioRaw === "object") {
    prontuario = prontuarioRaw as Prontuario & { _count: { evolucoes: number; documentos: number; fotos: number } }
  }

  if (prontuario?.id) {
    const [evolucoes, documentos, fotos] = await Promise.all([
      supabaseAdmin
        .from("evolucoes")
        .select("id", { count: "exact", head: true })
        .eq("prontuarioId", prontuario.id)
        .is("deletadoEm", null),
      supabaseAdmin
        .from("documentos_prontuario")
        .select("id", { count: "exact", head: true })
        .eq("prontuarioId", prontuario.id),
      supabaseAdmin
        .from("fotos_prontuario")
        .select("id", { count: "exact", head: true })
        .eq("prontuarioId", prontuario.id),
    ])

    if (Array.isArray(prontuario.anamnese)) {
      ;(prontuario as { anamnese: unknown }).anamnese = prontuario.anamnese[0] ?? null
    }

    prontuario._count = {
      evolucoes: evolucoes.count ?? 0,
      documentos: documentos.count ?? 0,
      fotos: fotos.count ?? 0,
    }
  }

  type AgendamentoOrdenavel = { dataHora?: string | null }
  const agendamentos = ((paciente.agendamentos as AgendamentoOrdenavel[] | undefined) ?? [])
    .slice()
    .sort((a, b) => (b.dataHora ?? "").localeCompare(a.dataHora ?? ""))
    .slice(0, 10)

  return NextResponse.json({
    ...paciente,
    prontuario,
    agendamentos,
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const rateLimitResult = await checkRateLimitPaciente(auth.session.user.id)
  if (rateLimitResult.bloqueado) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em alguns minutos." },
      { status: 429 }
    )
  }
  await registrarTentativaPaciente(auth.session.user.id)

  const body = await request.json()
  const parsed = atualizarPacienteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: pacienteAtual } = await supabaseAdmin
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!pacienteAtual) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  const { cpf, dataNascimento, consentimentoLgpd, ...resto } = parsed.data

  if (cpf && cpf.length === 11 && cpf !== pacienteAtual.cpf) {
    const { data: existente } = await supabaseAdmin
      .from("pacientes")
      .select("id")
      .eq("cpf", cpf)
      .maybeSingle()
    if (existente) {
      return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 })
    }
  }

  const dadosUpdate: Record<string, unknown> = { ...resto, atualizadoEm: agora() }
  if (cpf !== undefined) {
    dadosUpdate.cpf = cpf && cpf.length === 11 ? cpf : null
  }
  if (dataNascimento !== undefined) {
    dadosUpdate.dataNascimento = dataNascimento ? new Date(dataNascimento).toISOString() : null
  }
  if (consentimentoLgpd !== undefined) {
    dadosUpdate.consentimentoLgpd = consentimentoLgpd
    if (consentimentoLgpd && !pacienteAtual.consentimentoLgpd) {
      dadosUpdate.consentimentoLgpdEm = agora()
    }
  }

  const { data: pacienteAtualizado, error } = await supabaseAdmin
    .from("pacientes")
    .update(dadosUpdate)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "Paciente",
    entidadeId: id,
    dadosAntes: pacienteAtual as unknown as Record<string, unknown>,
    dadosDepois: pacienteAtualizado as unknown as Record<string, unknown>,
  })

  return NextResponse.json(pacienteAtualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: paciente } = await supabaseAdmin
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  await supabaseAdmin
    .from("pacientes")
    .update({ deletadoEm: agora(), ativo: false, atualizadoEm: agora() })
    .eq("id", id)

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "excluir",
    entidade: "Paciente",
    entidadeId: id,
    dadosAntes: paciente as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ mensagem: "Paciente removido" })
}
