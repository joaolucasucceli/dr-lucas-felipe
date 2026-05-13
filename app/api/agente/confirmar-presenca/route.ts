import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { agora } from "@/lib/db-utils"

const schema = z.object({
  agendamentoId: z.string().min(1),
})

/**
 * Paciente confirmou que compareceu na avaliacao online — marca o
 * agendamento como `realizado` E encerra a conversa (`iaResponde=false`).
 * IA para de responder definitivamente nesse contato. Se o paciente
 * voltar dias depois, o fluxo de reabertura precisa ser explicito (hoje:
 * abrir nova conversa via `abrirNovoCiclo`).
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

  const { agendamentoId } = parsed.data

  const { data: atual } = await supabaseAdmin
    .from("agendamentos")
    .select("id, status, dataHora, contatoId, posEventoEnviado")
    .eq("id", agendamentoId)
    .maybeSingle()

  if (!atual) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  // Idempotente: ja realizado, encerra tudo de novo (no-op se ja estava)
  if (atual.status === "realizado") {
    await supabaseAdmin
      .from("conversas")
      .update({ iaResponde: false, atualizadoEm: agora() } as never)
      .eq("contatoId", atual.contatoId)
      .is("encerradaEm", null)
    return NextResponse.json({ ok: true, jaRealizado: true })
  }

  // So permite marcar realizado se o cron de pos-evento ja enviou a pergunta.
  // Caso contrario IA pode estar tentando atalho/alucinacao.
  if (!atual.posEventoEnviado) {
    return NextResponse.json(
      { error: "Agendamento ainda não recebeu mensagem de pós-evento — confirmação inválida" },
      { status: 400 }
    )
  }

  if (atual.status === "cancelado" || atual.status === "nao_compareceu") {
    return NextResponse.json(
      { error: `Status atual '${atual.status}' não permite marcar como realizado` },
      { status: 400 }
    )
  }

  const { error: errorAg } = await supabaseAdmin
    .from("agendamentos")
    .update({ status: "realizado", atualizadoEm: agora() } as never)
    .eq("id", agendamentoId)

  if (errorAg) {
    return NextResponse.json({ error: errorAg.message }, { status: 500 })
  }

  // Encerra TODAS as conversas ativas desse contato (esperado ter 1, mas
  // defensivo) — IA nao responde mais nesse paciente.
  const { error: errorConv } = await supabaseAdmin
    .from("conversas")
    .update({
      iaResponde: false,
      encerradaEm: agora(),
      atualizadoEm: agora(),
    } as never)
    .eq("contatoId", atual.contatoId)
    .is("encerradaEm", null)

  if (errorConv) {
    console.error("[confirmar-presenca] Erro ao encerrar conversa:", errorConv)
    // Nao falha a tool — agendamento ja virou realizado.
  }

  return NextResponse.json({
    ok: true,
    status: "realizado",
    conversaEncerrada: true,
  })
}
