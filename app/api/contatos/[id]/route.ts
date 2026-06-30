import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, requireAnyRole, requireRole } from "@/lib/auth-helpers"
import { atualizarContatoSchema } from "@/lib/validations/contato"
import {
  limparDependenciasDoContato,
  anonimizarWhatsapp,
} from "@/lib/contatos/limpar-dependencias"
import { registrarAuditLog } from "@/lib/audit"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

const SELECT_CONTATO_ATUALIZADO =
  "id, tipo, nome, whatsapp, email, procedimentoInteresse, statusFunil, origem, sobreOPaciente, responsavelId, arquivado, cpf, dataNascimento, sexo, endereco, cidade, estado, contatoEmergencia, contatoEmergenciaTel, consentimentoLgpd, consentimentoLgpdEm, criadoEm, atualizadoEm, promovidoEm"

const CONTATO_NAO_ENCONTRADO = {
  code: "CONTATO_NAO_ENCONTRADO",
  error: "Contato não encontrado",
  message: "Esse contato pode ter sido excluído ou não está mais disponível.",
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params

  // Campos enxutos por tabela — antes era select * recursivo que podia
  // gerar payload de 3-10MB com ~200 mensagens. Cada lista pega so os
  // campos consumidos no front (ver app/(dashboard)/contatos/[id]/page.tsx).
  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select(`
      ${SELECT_CONTATO_ATUALIZADO},
      responsavel:usuarios!contatos_responsavelId_fkey(id, nome),
      agendamentos(id, dataHora, status, tipo, duracao, observacao, googleEventUrl, criadoEm, realizadoEm, realizadoPor, procedimento:procedimentos(id, nome)),
      conversas(id, ciclo, etapa, modoConversa, criadoEm, atualizadoEm, mensagens:mensagens_whatsapp(id, tipo, conteudo, remetente, mediaUrl, mediaType, criadoEm, replyTo:mensagens_whatsapp!replyToId(id, conteudo, remetente))),
      fotos:fotos_contato(id, url, descricao, categoria, tipoAnalise, criadoEm),
      prontuario:prontuarios(*, anamnese:anamneses(*))
    `)
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) {
    return NextResponse.json(CONTATO_NAO_ENCONTRADO, { status: 404 })
  }

  // Atendente só vê contatos tipo lead
  if (auth.session.user.perfil === "atendente" && contato.tipo !== "lead") {
    return NextResponse.json(CONTATO_NAO_ENCONTRADO, { status: 404 })
  }

  type ConversaOrdenavel = { ciclo?: number | null; atualizadoEm?: string | null }
  type MensagemOrdenavel = { criadoEm?: string | null }
  type AgendamentoOrdenavel = { dataHora?: string | null }
  type FotoOrdenavel = { criadoEm?: string | null }

  const conversasOrdenadas = [...((contato.conversas as ConversaOrdenavel[]) ?? [])].sort((a, b) => {
    const cicloA = a.ciclo ?? 0
    const cicloB = b.ciclo ?? 0
    if (cicloB !== cicloA) return cicloB - cicloA
    return (b.atualizadoEm ?? "").localeCompare(a.atualizadoEm ?? "")
  })

  for (const conversa of conversasOrdenadas as Array<ConversaOrdenavel & { mensagens?: Array<MensagemOrdenavel & { replyTo?: unknown }> }>) {
    if (Array.isArray(conversa.mensagens)) {
      conversa.mensagens.sort((a, b) => (a.criadoEm ?? "").localeCompare(b.criadoEm ?? ""))
      for (const msg of conversa.mensagens) {
        if (Array.isArray(msg.replyTo)) {
          msg.replyTo = msg.replyTo[0] ?? null
        }
      }
    }
  }

  const agendamentosOrdenados = [...((contato.agendamentos as AgendamentoOrdenavel[]) ?? [])].sort((a, b) =>
    (b.dataHora ?? "").localeCompare(a.dataHora ?? "")
  )

  const fotosOrdenadas = [...((contato.fotos as FotoOrdenavel[]) ?? [])].sort((a, b) =>
    (b.criadoEm ?? "").localeCompare(a.criadoEm ?? "")
  )

  // prontuario vem como array pq postgrest nao infere 1:1 sem FK unica
  const prontuarioRaw = contato.prontuario as unknown
  type Prontuario = { id: string; anamnese: unknown }
  let prontuario: (Prontuario & { _count?: { evolucoes: number; documentos: number; fotos: number } }) | null = null

  if (Array.isArray(prontuarioRaw) && prontuarioRaw.length > 0) {
    prontuario = prontuarioRaw[0] as Prontuario
  } else if (prontuarioRaw && typeof prontuarioRaw === "object") {
    prontuario = prontuarioRaw as Prontuario
  }

  if (prontuario?.id && contato.tipo === "paciente") {
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
        .from("fotos_contato")
        .select("id", { count: "exact", head: true })
        .eq("contatoId", id),
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

  return NextResponse.json({
    ...contato,
    conversas: conversasOrdenadas,
    agendamentos: agendamentosOrdenados,
    fotos: fotosOrdenadas,
    prontuario,
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(["gestor", "atendente"])
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarContatoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: contatoAtual } = await supabaseAdmin
    .from("contatos")
    .select("id, tipo, whatsapp, sobreOPaciente, cpf, consentimentoLgpd")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contatoAtual) {
    return NextResponse.json(CONTATO_NAO_ENCONTRADO, { status: 404 })
  }

  // Atendente só mexe em contato tipo lead
  if (auth.session.user.perfil === "atendente" && contatoAtual.tipo !== "lead") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const { cpf, dataNascimento, consentimentoLgpd, sobreOPaciente, whatsapp, ...resto } = parsed.data

  const dadosUpdate: Record<string, unknown> = { ...resto, atualizadoEm: agora() }

  if (sobreOPaciente) {
    const textoAtual = contatoAtual.sobreOPaciente || ""
    dadosUpdate.sobreOPaciente = textoAtual
      ? `${textoAtual}\n---\n${sobreOPaciente}`
      : sobreOPaciente
  }

  if (whatsapp !== undefined && whatsapp !== "" && whatsapp !== contatoAtual.whatsapp) {
    const { data: existente } = await supabaseAdmin
      .from("contatos")
      .select("id")
      .eq("whatsapp", whatsapp)
      .is("deletadoEm", null)
      .maybeSingle()
    if (existente) {
      return NextResponse.json({ error: "WhatsApp já cadastrado" }, { status: 409 })
    }
    dadosUpdate.whatsapp = whatsapp
  }

  if (cpf !== undefined) {
    if (cpf && cpf.length === 11 && cpf !== contatoAtual.cpf) {
      const { data: cpfExistente } = await supabaseAdmin
        .from("contatos")
        .select("id")
        .eq("cpf", cpf)
        .is("deletadoEm", null)
        .maybeSingle()
      if (cpfExistente) {
        return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 })
      }
    }
    dadosUpdate.cpf = cpf && cpf.length === 11 ? cpf : null
  }

  if (dataNascimento !== undefined) {
    dadosUpdate.dataNascimento = dataNascimento ? new Date(dataNascimento).toISOString() : null
  }

  if (consentimentoLgpd !== undefined) {
    dadosUpdate.consentimentoLgpd = consentimentoLgpd
    if (consentimentoLgpd && !contatoAtual.consentimentoLgpd) {
      dadosUpdate.consentimentoLgpdEm = agora()
    }
  }

  const { data: contatoAtualizado, error } = await supabaseAdmin
    .from("contatos")
    .update(dadosUpdate as never)
    .eq("id", id)
    .select(SELECT_CONTATO_ATUALIZADO)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "Contato",
    entidadeId: id,
    dadosAntes: contatoAtual as unknown as Record<string, unknown>,
    dadosDepois: contatoAtualizado as unknown as Record<string, unknown>,
  })

  return NextResponse.json(contatoAtualizado)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("id, whatsapp")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) {
    return NextResponse.json(CONTATO_NAO_ENCONTRADO, { status: 404 })
  }

  const chatId = contato.whatsapp ? `${contato.whatsapp}@s.whatsapp.net` : null

  try {
    await limparDependenciasDoContato({ contatoId: id, chatId })
  } catch (err) {
    console.error("[contatos.DELETE] Falha ao limpar dependencias:", err)
    return NextResponse.json(
      { error: "Erro ao limpar dados do contato" },
      { status: 500 }
    )
  }

  const whatsappAnonimo = contato.whatsapp ? anonimizarWhatsapp(contato.whatsapp, id) : null

  const { data: atualizado, error: updateError } = await supabaseAdmin
    .from("contatos")
    .update({
      deletadoEm: agora(),
      atualizadoEm: agora(),
      ...(whatsappAnonimo ? { whatsapp: whatsappAnonimo } : {}),
    })
    .eq("id", id)
    .select("id, deletadoEm")
    .maybeSingle()

  if (updateError || !atualizado?.deletadoEm) {
    console.error("[contatos.DELETE] Soft-delete falhou:", {
      contatoId: id,
      updateError: updateError?.message,
    })
    return NextResponse.json(
      { error: `Falha ao marcar contato como deletado: ${updateError?.message || "update nao aplicado"}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ mensagem: "Contato removido" })
}
