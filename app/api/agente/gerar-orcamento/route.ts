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

/**
 * Tool `gerar_orcamento` (Caminho A do fluxo de orcamento).
 *
 * Disparada pela Ana Julia SOMENTE apos qualificacao completa (procedimento +
 * regiao + foto) + interesse gerado + paciente toppou receber orcamento.
 * Efeitos:
 *  - eventos_orcamento_pendente: insere registro (fila + auditoria)
 *  - contatos: marca aguardandoOrcamentoHumano=true + aguardandoOrcamentoDesde
 *    (PAUSA o atendimento da Ana ate o Dr. Lucas responder o valor)
 *  - dispara notificacao WhatsApp pro Dr. Lucas (best-effort, nao falha a tool)
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
    .select("id, criadoEm")
    .eq("contatoId", contatoId)
    .is("respondidoEm", null)
    .is("canceladoEm", null)
    .maybeSingle()

  if (existente) {
    return NextResponse.json({
      ok: true,
      jaPendente: true,
      orcamentoPendenteId: existente.id,
      criadoEm: existente.criadoEm,
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

  await supabaseAdmin
    .from("contatos")
    .update({
      aguardandoOrcamentoHumano: true,
      aguardandoOrcamentoDesde: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", contatoId)

  // Notificacao Uazapi (best-effort — se falhar, evento ja esta no banco e a
  // UI do painel mostra como pendente).
  notificarDrLucasOrcamento({
    orcamentoPendenteId: id,
    contatoId,
    resumoCaso,
    prioridade: prioridade ?? "normal",
  }).catch((err) => {
    console.error(
      "[gerar-orcamento] notificacao Dr. Lucas falhou (nao bloqueia):",
      err
    )
  })

  return NextResponse.json({
    ok: true,
    aguardando: true,
    orcamentoPendenteId: id,
  })
}
