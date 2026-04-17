import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, requireAnyRole, requireRole } from "@/lib/auth-helpers"
import { atualizarLeadSchema } from "@/lib/validations/lead"
import {
  limparDependenciasDoLead,
  anonimizarWhatsapp,
} from "@/lib/leads/limpar-dependencias"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

const SELECT_LEAD_ATUALIZADO =
  "id, nome, whatsapp, email, procedimentoInteresse, statusFunil, origem, sobreOPaciente, responsavelId, arquivado, criadoEm, atualizadoEm"

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(`
      *,
      responsavel:usuarios!leads_responsavelId_fkey(id, nome),
      agendamentos(*, procedimento:procedimentos(id, nome)),
      conversas(*, mensagens:mensagens_whatsapp(*, replyTo:mensagens_whatsapp!mensagens_whatsapp_replyToId_fkey(id, conteudo, remetente))),
      fotos:fotos_lead(*),
      paciente:pacientes(id, nome)
    `)
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  type ConversaOrdenavel = { ciclo?: number | null; atualizadoEm?: string | null }
  type MensagemOrdenavel = { criadoEm?: string | null }
  type AgendamentoOrdenavel = { dataHora?: string | null }
  type FotoOrdenavel = { criadoEm?: string | null }

  const conversasOrdenadas = [...((lead.conversas as ConversaOrdenavel[]) ?? [])].sort((a, b) => {
    const cicloA = a.ciclo ?? 0
    const cicloB = b.ciclo ?? 0
    if (cicloB !== cicloA) return cicloB - cicloA
    return (b.atualizadoEm ?? "").localeCompare(a.atualizadoEm ?? "")
  })

  for (const conversa of conversasOrdenadas as Array<ConversaOrdenavel & { mensagens?: MensagemOrdenavel[] }>) {
    if (Array.isArray(conversa.mensagens)) {
      conversa.mensagens.sort((a, b) => (a.criadoEm ?? "").localeCompare(b.criadoEm ?? ""))
    }
  }

  const agendamentosOrdenados = [...((lead.agendamentos as AgendamentoOrdenavel[]) ?? [])].sort((a, b) =>
    (b.dataHora ?? "").localeCompare(a.dataHora ?? "")
  )

  const fotosOrdenadas = [...((lead.fotos as FotoOrdenavel[]) ?? [])].sort((a, b) =>
    (b.criadoEm ?? "").localeCompare(a.criadoEm ?? "")
  )

  return NextResponse.json({
    ...lead,
    conversas: conversasOrdenadas,
    agendamentos: agendamentosOrdenados,
    fotos: fotosOrdenadas,
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarLeadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: leadAtual } = await supabaseAdmin
    .from("leads")
    .select("id, whatsapp, sobreOPaciente")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!leadAtual) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const dados = { ...parsed.data }

  if (dados.sobreOPaciente) {
    const textoAtual = leadAtual.sobreOPaciente || ""
    dados.sobreOPaciente = textoAtual
      ? `${textoAtual}\n---\n${dados.sobreOPaciente}`
      : dados.sobreOPaciente
  }

  if (dados.whatsapp && dados.whatsapp !== leadAtual.whatsapp) {
    const { data: existente } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("whatsapp", dados.whatsapp)
      .maybeSingle()
    if (existente) {
      return NextResponse.json({ error: "WhatsApp já cadastrado" }, { status: 409 })
    }
  }

  const updateData = { ...dados, atualizadoEm: agora() } as never

  const { data: leadAtualizado, error } = await supabaseAdmin
    .from("leads")
    .update(updateData)
    .eq("id", id)
    .select(SELECT_LEAD_ATUALIZADO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(leadAtualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, whatsapp")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const chatId = lead.whatsapp ? `${lead.whatsapp}@s.whatsapp.net` : null

  try {
    await limparDependenciasDoLead({ leadId: id, chatId })
  } catch (err) {
    console.error("[leads.DELETE] Falha ao limpar dependencias:", err)
    return NextResponse.json(
      { error: "Erro ao limpar dados do lead" },
      { status: 500 }
    )
  }

  const whatsappAnonimo = lead.whatsapp ? anonimizarWhatsapp(lead.whatsapp) : null

  await supabaseAdmin
    .from("leads")
    .update({
      deletadoEm: agora(),
      atualizadoEm: agora(),
      ...(whatsappAnonimo ? { whatsapp: whatsappAnonimo } : {}),
    })
    .eq("id", id)

  return NextResponse.json({ mensagem: "Lead removido" })
}
