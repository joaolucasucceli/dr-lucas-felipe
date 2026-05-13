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
 * Paciente respondeu que NAO compareceu na avaliacao online — marca o
 * agendamento como `nao_compareceu`. NAO encerra a conversa: IA continua
 * ativa pra remarcar (proximo turno deve oferecer consultar_agenda +
 * atualizar_agendamento conforme regra do prompt).
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
    .select("id, status, posEventoEnviado")
    .eq("id", agendamentoId)
    .maybeSingle()

  if (!atual) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  if (atual.status === "nao_compareceu") {
    return NextResponse.json({ ok: true, jaMarcado: true })
  }

  if (!atual.posEventoEnviado) {
    return NextResponse.json(
      { error: "Agendamento ainda não recebeu mensagem de pós-evento — marcação inválida" },
      { status: 400 }
    )
  }

  if (atual.status === "cancelado" || atual.status === "realizado") {
    return NextResponse.json(
      { error: `Status atual '${atual.status}' não permite marcar como não compareceu` },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from("agendamentos")
    .update({ status: "nao_compareceu", atualizadoEm: agora() } as never)
    .eq("id", agendamentoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: "nao_compareceu" })
}
