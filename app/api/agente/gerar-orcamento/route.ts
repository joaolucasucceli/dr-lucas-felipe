import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarId, agora } from "@/lib/db-utils"
import { notificarDrLucasOrcamento } from "@/lib/agente/notificar-handoff"

const schema = z.object({
  contatoId: z.string().min(1),
  conversaId: z.string().optional(),
  resumoCaso: z.string().min(10),
  prioridade: z.enum(["normal", "urgente"]).optional(),
})

async function moverParaOrcamento(
  contatoId: string,
  conversaId?: string | null
) {
  const tsAgora = agora()
  await supabaseAdmin
    .from("contatos")
    .update({
      statusFunil: "orcamento" as never,
      ultimaMovimentacaoEm: tsAgora,
      aguardandoOrcamentoHumano: true,
      aguardandoOrcamentoDesde: tsAgora,
      atualizadoEm: tsAgora,
    })
    .eq("id", contatoId)

  if (conversaId) {
    await supabaseAdmin
      .from("conversas")
      .update({ etapa: "orcamento" as never, atualizadoEm: tsAgora })
      .eq("id", conversaId)
  }
}

/**
 * Tool `gerar_orcamento` (Caminho A do fluxo de orcamento).
 *
 * Disparada pela Ana Julia SOMENTE apos qualificacao completa (procedimento +
 * regiao + foto) + interesse gerado + paciente toppou receber orcamento.
 * Efeitos:
 *  - eventos_orcamento_pendente: insere registro (fila + auditoria)
 *  - contatos: marca aguardandoOrcamentoHumano=true + aguardandoOrcamentoDesde
 *    (PAUSA o atendimento da Ana ate o Dr. Lucas responder o valor)
 *  - dispara notificacao WhatsApp pro Dr. Lucas (obrigatoria para sucesso)
 *
 * O Dr. Lucas responde no WhatsApp pessoal dele no formato `<numero> - <valor>`
 * pro numero da clinica. O webhook intercepta, gera o PDF, manda pra cliente e
 * retoma o atendimento (ver app/api/webhooks/whatsapp/route.ts).
 *
 * Idempotencia: se ja existe orcamento pendente aberto pro contato, nao cria
 * novo nem notifica de novo.
 */
export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { contatoId, conversaId, resumoCaso, prioridade } = parsed.data

  // Idempotencia: ja existe orcamento aberto pro contato?
  const { data: existente } = await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .select("id, criadoEm, notificacaoEnviadaEm, resumoCaso, prioridade")
    .eq("contatoId", contatoId)
    .is("respondidoEm", null)
    .is("canceladoEm", null)
    .maybeSingle()

  if (existente) {
    let notificacaoEnviadaEm = existente.notificacaoEnviadaEm
    if (!existente.notificacaoEnviadaEm) {
      const resultadoNotificacao = await notificarDrLucasOrcamento({
        orcamentoPendenteId: existente.id,
        contatoId,
        resumoCaso: existente.resumoCaso || resumoCaso,
        prioridade:
          (existente.prioridade as "normal" | "urgente" | null) ?? "normal",
      })

      if (!resultadoNotificacao.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "Nao consegui notificar o Dr. Lucas agora",
            detalhe: resultadoNotificacao.error,
          },
          { status: 502 }
        )
      }
      notificacaoEnviadaEm = resultadoNotificacao.notificacaoEnviadaEm
    }

    await moverParaOrcamento(contatoId, conversaId ?? null)
    return NextResponse.json({
      ok: true,
      jaPendente: true,
      orcamentoPendenteId: existente.id,
      criadoEm: existente.criadoEm,
      notificacaoEnviadaEm,
    })
  }

  // Se o Dr. Lucas ja respondeu um orcamento neste ciclo, nao cria uma nova
  // pendencia so porque o modelo perdeu contexto ou o paciente aprovou seguir.
  const { data: respondido } = await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .select("id, respondidoEm, observacoes")
    .eq("contatoId", contatoId)
    .not("respondidoEm", "is", null)
    .is("canceladoEm", null)
    .order("respondidoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (respondido) {
    return NextResponse.json({
      ok: true,
      jaRespondido: true,
      orcamentoRespondidoId: respondido.id,
      respondidoEm: respondido.respondidoEm,
      observacoes: respondido.observacoes,
    })
  }

  const id = criarId()

  const { error: errOrc } = await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .insert({
      id,
      contatoId,
      conversaId: conversaId ?? null,
      resumoCaso,
      prioridade: prioridade ?? "normal",
      criadoEm: agora(),
    })

  if (errOrc) {
    return NextResponse.json({ error: errOrc.message }, { status: 500 })
  }

  const resultadoNotificacao = await notificarDrLucasOrcamento({
    orcamentoPendenteId: id,
    contatoId,
    resumoCaso,
    prioridade: prioridade ?? "normal",
  })

  if (!resultadoNotificacao.ok) {
    await supabaseAdmin
      .from("eventos_orcamento_pendente")
      .update({
        canceladoEm: agora(),
        observacoes: `Falha ao notificar Dr. Lucas: ${resultadoNotificacao.error}`,
      })
      .eq("id", id)

    return NextResponse.json(
      {
        ok: false,
        error: "Nao consegui notificar o Dr. Lucas agora",
        detalhe: resultadoNotificacao.error,
      },
      { status: 502 }
    )
  }

  const tsAgora = agora()
  await supabaseAdmin
    .from("contatos")
    .update({
      statusFunil: "orcamento" as never,
      ultimaMovimentacaoEm: tsAgora,
      aguardandoOrcamentoHumano: true,
      aguardandoOrcamentoDesde: tsAgora,
      atualizadoEm: tsAgora,
    })
    .eq("id", contatoId)

  if (conversaId) {
    await supabaseAdmin
      .from("conversas")
      .update({ etapa: "orcamento" as never, atualizadoEm: tsAgora })
      .eq("id", conversaId)
  }

  return NextResponse.json({
    ok: true,
    aguardando: true,
    orcamentoPendenteId: id,
    notificacaoEnviadaEm: resultadoNotificacao.notificacaoEnviadaEm,
  })
}
