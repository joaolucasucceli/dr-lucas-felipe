import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { orcamentoVigente } from "@/lib/orcamento/vigencia"
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

  // Se o Dr. Lucas ja respondeu um orcamento VIGENTE neste atendimento, nao cria
  // outra pendencia so porque o modelo perdeu contexto.
  //
  // Ate 23/07/2026 esta query nao filtrava atendimento nem validade, apesar do
  // comentario dizer "neste ciclo": um orcamento de qualquer epoca bloqueava
  // orcamento novo PARA SEMPRE, e em silencio — lead real em numero reaproveitado
  // nunca conseguiria ter o proprio. Ver OPE-427.
  const vigente = await orcamentoVigente({ contatoId, conversaId: conversaId ?? null })

  if (vigente) {
    return NextResponse.json({
      ok: true,
      jaRespondido: true,
      orcamentoRespondidoId: vigente.id,
      respondidoEm: vigente.respondidoEm,
      validoAte: vigente.validoAte,
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
