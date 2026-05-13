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
 * Pausa o atendimento da Ana Julia e sinaliza o Dr. Lucas pra responder
 * o orcamento manualmente. Efeitos:
 *  - eventos_orcamento_pendente: insere novo registro (fila + auditoria)
 *  - contatos: marca aguardandoOrcamentoHumano=true + aguardandoOrcamentoDesde
 *  - dispara notificacao WhatsApp pro Dr. Lucas (best-effort, nao falha a tool)
 *
 * Idempotencia: se ja existe orcamento pendente aberto pro mesmo contato,
 * nao cria novo nem manda notificacao duplicada.
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

  // Notificacao Uazapi (best-effort — se falhar, evento ja esta no banco e UI
  // do painel mostra como pendente. Dr. Lucas pode descobrir pela UI tambem).
  notificarDrLucasOrcamento({
    orcamentoPendenteId: id,
    contatoId,
    resumoCaso,
    prioridade: prioridade ?? "normal",
  }).catch((err) => {
    console.error("[solicitar-orcamento-humano] notificacao falhou (nao bloqueia):", err)
  })

  return NextResponse.json({
    ok: true,
    aguardando: true,
    orcamentoPendenteId: id,
  })
}
