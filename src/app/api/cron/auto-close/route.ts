import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarCronSecret } from "@/lib/cron-auth"
import { agora } from "@/lib/db-utils"
import { JANELA_ATENDIMENTO_HORAS } from "@/lib/conversas/atendimento"

export const maxDuration = 300

/**
 * Encerra atendimentos parados ha mais de `JANELA_ATENDIMENTO_HORAS`.
 *
 * Ate 23/07/2026 este cron so encerrava conversa que ja tivesse recebido o
 * follow-up "24h". Como `agente/followup.ts` nao manda follow-up para a etapa
 * `consulta_agendada`, conversa que chegava la nunca entrava nesta fila e ficava
 * aberta PARA SEMPRE — foi o que permitiu a Ana Julia despejar um orcamento de
 * nove dias atras no primeiro "Ola" de uma conversa nova (print do Dr. Lucas,
 * OPE-424). Agora a regra e so o silencio, e vale para todas as etapas.
 *
 * O encerramento tambem acontece na chegada da mensagem
 * (`obterOuAbrirAtendimento`), entao este cron e higiene: fecha o que nunca mais
 * recebeu mensagem, para o kanban e os relatorios nao mostrarem atendimento
 * ativo que nao existe. Se ele falhar, ninguem recebe contexto errado.
 */
export async function GET(request: NextRequest) {
  const erro = validarCronSecret(request)
  if (erro) return erro

  const limite = new Date(
    Date.now() - JANELA_ATENDIMENTO_HORAS * 60 * 60 * 1000
  ).toISOString()

  // Conversa sem nenhuma mensagem tambem expira — pela data de criacao.
  const { data: conversas, error } = await supabaseAdmin
    .from("conversas")
    .select("id, ultimaMensagemEm, criadoEm")
    .is("encerradaEm", null)
    .or(`ultimaMensagemEm.lt.${limite},and(ultimaMensagemEm.is.null,criadoEm.lt.${limite})`)

  if (error) {
    console.error("[Cron Auto-close] Erro ao listar conversas:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let encerradas = 0

  for (const conversa of conversas ?? []) {
    try {
      // Data da ultima atividade real, nao "agora": encerrar com o timestamp do
      // cron faria o historico mentir sobre quando o atendimento parou.
      const { error: erroUpdate } = await supabaseAdmin
        .from("conversas")
        .update({
          encerradaEm: conversa.ultimaMensagemEm ?? conversa.criadoEm,
          atualizadoEm: agora(),
        })
        .eq("id", conversa.id)
        .is("encerradaEm", null)

      if (erroUpdate) throw new Error(erroUpdate.message)
      encerradas++
    } catch (error) {
      console.error(`[Cron Auto-close] Erro ao encerrar conversa ${conversa.id}:`, error)
    }
  }

  return NextResponse.json({
    encerradas,
    janelaHoras: JANELA_ATENDIMENTO_HORAS,
    timestamp: new Date().toISOString(),
  })
}
