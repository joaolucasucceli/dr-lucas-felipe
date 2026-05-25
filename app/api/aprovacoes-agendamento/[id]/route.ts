import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarEvento } from "@/lib/google-calendar"
import { criarId, agora } from "@/lib/db-utils"
import { validarSlotManual } from "@/lib/agendamento/validar-slot"
import { enviarMensagem } from "@/lib/uazapi"

// JLU-170 v2 (B 25/05): PATCH processa decisao do gestor sobre aprovacao
// pendente. 3 acoes:
//   - aprovar: cria agendamento real + responde paciente confirmando
//   - rejeitar: marca rejeitado + Ana Julia avisa paciente (com motivo)
//   - cancelar: marca cancelado (gestor desistiu da consulta)

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  acao: z.enum(["aprovar", "rejeitar", "cancelar"]),
  motivoRejeicao: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { acao, motivoRejeicao } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any
  const { data: aprov } = await sb
    .from("aprovacoes_agendamento")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  type Aprov = {
    id: string
    contatoId: string
    conversaId: string | null
    dataHora: string
    procedimentoId: string | null
    email: string
    observacao: string | null
    status: string
  }
  const a = aprov as unknown as Aprov | null

  if (!a) {
    return NextResponse.json({ error: "Aprovação não encontrada" }, { status: 404 })
  }
  if (a.status !== "aguardando") {
    return NextResponse.json(
      { error: `Aprovação já foi ${a.status}` },
      { status: 409 }
    )
  }

  if (acao === "aprovar") {
    return await aprovar(a, auth.session.user.id)
  }
  if (acao === "rejeitar") {
    return await rejeitar(a, auth.session.user.id, motivoRejeicao ?? null)
  }
  // cancelar
  return await cancelar(a, auth.session.user.id)
}

async function aprovar(a: {
  id: string
  contatoId: string
  conversaId: string | null
  dataHora: string
  procedimentoId: string | null
  email: string
  observacao: string | null
}, gestorId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any
  const inicio = new Date(a.dataHora)
  const val = await validarSlotManual(inicio, 60)
  if (!val.ok) {
    return NextResponse.json(
      { error: `Slot inválido agora: ${val.motivo}. Sugira outro horário.` },
      { status: 400 }
    )
  }

  // Atualizar email do contato (cobertura caso tenha mudado)
  await supabaseAdmin
    .from("contatos")
    .update({ email: a.email, atualizadoEm: agora() } as never)
    .eq("id", a.contatoId)

  // Resolver procedimento por procedimentoInteresse caso nao tenha
  let finalProcedimentoId = a.procedimentoId
  if (!finalProcedimentoId) {
    const { data: c } = await supabaseAdmin
      .from("contatos")
      .select("procedimentoInteresse")
      .eq("id", a.contatoId)
      .maybeSingle()
    const interesse = (c as { procedimentoInteresse: string | null } | null)?.procedimentoInteresse?.trim()
    if (interesse) {
      const { data: proc } = await supabaseAdmin
        .from("procedimentos")
        .select("id")
        .ilike("nome", `%${interesse}%`)
        .eq("ativo", true)
        .is("deletadoEm", null)
        .limit(1)
        .maybeSingle()
      if (proc?.id) finalProcedimentoId = proc.id
    }
  }

  const { data: agendamento, error: agErr } = await supabaseAdmin
    .from("agendamentos")
    .insert({
      id: criarId(),
      atualizadoEm: agora(),
      contatoId: a.contatoId,
      procedimentoId: finalProcedimentoId || null,
      dataHora: inicio.toISOString(),
      status: "agendado",
      observacao: a.observacao || null,
      criadoPor: "ia",
    } as never)
    .select("*")
    .single()

  if (agErr || !agendamento) {
    return NextResponse.json(
      { error: agErr?.message || "Erro ao criar agendamento" },
      { status: 500 }
    )
  }

  await supabaseAdmin
    .from("contatos")
    .update({
      statusFunil: "consulta_agendada",
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    } as never)
    .eq("id", a.contatoId)

  if (a.conversaId) {
    await supabaseAdmin
      .from("conversas")
      .update({ etapa: "consulta_agendada", atualizadoEm: agora() } as never)
      .eq("id", a.conversaId)
  }

  const [{ data: lead }, procRes] = await Promise.all([
    supabaseAdmin
      .from("contatos")
      .select("nome, email, whatsapp")
      .eq("id", a.contatoId)
      .maybeSingle(),
    finalProcedimentoId
      ? supabaseAdmin
          .from("procedimentos")
          .select("nome")
          .eq("id", finalProcedimentoId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const procedimento = procRes.data as { nome: string | null } | null
  const fim = new Date(inicio.getTime() + 60 * 60_000)
  const tituloEvento = procedimento?.nome
    ? `Avaliação — ${procedimento.nome} (${lead?.nome ?? "Paciente"})`
    : `Avaliação — ${lead?.nome ?? "Paciente"}`
  const descricaoEvento = [
    `Paciente: ${lead?.nome ?? "-"}`,
    lead?.whatsapp ? `WhatsApp: ${lead.whatsapp}` : null,
    procedimento?.nome ? `Procedimento: ${procedimento.nome}` : null,
    a.observacao ? `Observação: ${a.observacao}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const evento = await criarEvento({
    titulo: tituloEvento,
    descricao: descricaoEvento,
    inicio,
    fim,
    emailPaciente: lead?.email ?? undefined,
  })

  if (evento) {
    await supabaseAdmin
      .from("agendamentos")
      .update({
        googleEventId: evento.googleEventId,
        googleEventUrl: evento.googleEventUrl,
        sincronizado: true,
        duracao: 60,
        atualizadoEm: agora(),
      } as never)
      .eq("id", agendamento.id)
  }

  await sb
    .from("aprovacoes_agendamento")
    .update({
      status: "aprovado",
      respondidoEm: agora(),
      respondidoPor: gestorId,
      agendamentoCriadoId: agendamento.id,
    })
    .eq("id", a.id)

  // Mensagem pro paciente via Uazapi
  const labelData = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).format(inicio)
  const labelHora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).format(inicio)

  await notificarPaciente(
    a.contatoId,
    a.conversaId,
    `Tá fechado!\n---\nO Dr. Lucas confirmou ${labelData} às ${labelHora}.\n---\nO convite vai pro seu email já já.`
  )

  return NextResponse.json({ ok: true, agendamentoId: agendamento.id })
}

async function rejeitar(a: {
  id: string
  contatoId: string
  conversaId: string | null
}, gestorId: string, motivo: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any
  await sb
    .from("aprovacoes_agendamento")
    .update({
      status: "rejeitado",
      respondidoEm: agora(),
      respondidoPor: gestorId,
      motivoRejeicao: motivo,
    })
    .eq("id", a.id)

  const msg = motivo
    ? `O Dr. Lucas precisa de outro horário pra essa avaliação (${motivo}). Posso te oferecer outras opções?`
    : `O Dr. Lucas pediu pra a gente ajustar esse horário. Posso te oferecer outras opções?`
  await notificarPaciente(a.contatoId, a.conversaId, msg)

  return NextResponse.json({ ok: true })
}

async function cancelar(a: {
  id: string
  contatoId: string
  conversaId: string | null
}, gestorId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any
  await sb
    .from("aprovacoes_agendamento")
    .update({
      status: "cancelado",
      respondidoEm: agora(),
      respondidoPor: gestorId,
    })
    .eq("id", a.id)

  await notificarPaciente(
    a.contatoId,
    a.conversaId,
    `O Dr. Lucas não vai poder atender você nessa data. Se quiser, posso te oferecer outras opções mais pra frente.`
  )

  return NextResponse.json({ ok: true })
}

async function notificarPaciente(contatoId: string, conversaId: string | null, mensagem: string) {
  try {
    const { data: configWa } = await supabaseAdmin
      .from("config_whatsapp")
      .select("uazapiUrl, instanceToken")
      .eq("ativo", true)
      .order("atualizadoEm", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!configWa?.uazapiUrl || !configWa?.instanceToken) return

    const { data: contato } = await supabaseAdmin
      .from("contatos")
      .select("whatsapp")
      .eq("id", contatoId)
      .maybeSingle()
    if (!contato?.whatsapp) return

    // segmentar por '---' (padrao Ana Julia)
    const partes = mensagem.split("\n---\n").map((p) => p.trim()).filter(Boolean)
    for (const parte of partes) {
      await enviarMensagem(
        configWa.uazapiUrl,
        configWa.instanceToken,
        contato.whatsapp,
        parte
      )
      // pequeno delay entre mensagens (humanizacao)
      await new Promise((r) => setTimeout(r, 1500))
    }

    // registra no banco pra aparecer no historico da conversa
    if (conversaId) {
      for (const parte of partes) {
        await supabaseAdmin
          .from("mensagens_whatsapp")
          .insert({
            id: criarId(),
            conversaId,
            contatoId,
            messageIdWhatsapp: `aprov_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            tipo: "texto",
            conteudo: parte,
            remetente: "agente",
          } as never)
      }
      await supabaseAdmin
        .from("conversas")
        .update({ ultimaMensagemEm: agora(), atualizadoEm: agora() } as never)
        .eq("id", conversaId)
    }
  } catch (e) {
    console.error("[aprovacoes-agendamento] notificarPaciente falhou:", e)
  }
}
