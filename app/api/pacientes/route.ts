import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarPacienteSchema } from "@/lib/validations/paciente"
import { registrarAuditLog } from "@/lib/audit"
import { checkRateLimitPaciente, registrarTentativaPaciente } from "@/lib/rate-limit"
import { criarId, agora } from "@/lib/db-utils"

const SELECT_LISTA = "id, nome, whatsapp, cpf, email, ativo, criadoEm, leadOrigemId"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const pagina = Number(searchParams.get("pagina") || "1")
  const porPagina = Number(searchParams.get("porPagina") || "10")
  const busca = searchParams.get("busca")
  const ativo = searchParams.get("ativo")

  let query = supabaseAdmin
    .from("pacientes")
    .select(SELECT_LISTA, { count: "exact" })
    .is("deletadoEm", null)
    .eq("ativo", ativo !== "false")

  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,whatsapp.ilike.%${busca}%,cpf.ilike.%${busca}%`)
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
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const rateLimitResult = await checkRateLimitPaciente(auth.session.user.id)
  if (rateLimitResult.bloqueado) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em alguns minutos." },
      { status: 429 }
    )
  }
  await registrarTentativaPaciente(auth.session.user.id)

  const body = await request.json()
  const parsed = criarPacienteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { cpf, dataNascimento, consentimentoLgpd, ...resto } = parsed.data

  if (cpf && cpf.length === 11) {
    const { data: existente } = await supabaseAdmin
      .from("pacientes")
      .select("id")
      .eq("cpf", cpf)
      .maybeSingle()
    if (existente) {
      return NextResponse.json(
        { error: "CPF já cadastrado" },
        { status: 409 }
      )
    }
  }

  const { data: ultimoProntuario } = await supabaseAdmin
    .from("prontuarios")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()

  const numeroProntuario = (ultimoProntuario?.numero ?? 0) + 1
  const tsAgora = agora()

  const pacienteId = criarId()
  const insertPacienteData = {
    id: pacienteId,
    atualizadoEm: tsAgora,
    ...resto,
    cpf: cpf && cpf.length === 11 ? cpf : null,
    dataNascimento: dataNascimento ? new Date(dataNascimento).toISOString() : null,
    consentimentoLgpd: consentimentoLgpd ?? false,
    consentimentoLgpdEm: consentimentoLgpd ? tsAgora : null,
  } as never

  const { data: paciente, error: pacienteError } = await supabaseAdmin
    .from("pacientes")
    .insert(insertPacienteData)
    .select("*")
    .single()

  if (pacienteError) {
    return NextResponse.json({ error: pacienteError.message }, { status: 500 })
  }

  const prontuarioId = criarId()
  const { error: prontuarioError } = await supabaseAdmin
    .from("prontuarios")
    .insert({
      id: prontuarioId,
      atualizadoEm: tsAgora,
      pacienteId,
      numero: numeroProntuario,
    })

  if (prontuarioError) {
    await supabaseAdmin.from("pacientes").delete().eq("id", pacienteId)
    return NextResponse.json({ error: prontuarioError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from("anamneses")
    .insert({
      id: criarId(),
      atualizadoEm: tsAgora,
      prontuarioId,
    })

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "criar",
    entidade: "Paciente",
    entidadeId: pacienteId,
    dadosDepois: paciente as unknown as Record<string, unknown>,
  })

  return NextResponse.json(paciente, { status: 201 })
}
