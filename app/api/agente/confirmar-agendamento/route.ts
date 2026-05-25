import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { agora } from "@/lib/db-utils"
import { pingConfirmadoDia } from "@/lib/agente/notificar-agendamento"

const schema = z.object({
  agendamentoId: z.string().min(1),
})

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
    .select("id, status, dataHora")
    .eq("id", agendamentoId)
    .maybeSingle()

  if (!atual) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
  }

  // Idempotente: se ja confirmado, so retorna
  if (atual.status === "confirmado") {
    return NextResponse.json({ ok: true, jaConfirmado: true })
  }

  // So permite confirmar se esta agendado/remarcado e no futuro
  if (atual.status !== "agendado" && atual.status !== "remarcado") {
    return NextResponse.json(
      { error: `Status atual '${atual.status}' não permite confirmação` },
      { status: 400 }
    )
  }

  if (new Date(atual.dataHora).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Agendamento ja passou — nao pode confirmar" },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from("agendamentos")
    .update({ status: "confirmado", atualizadoEm: agora() } as never)
    .eq("id", agendamentoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // JLU-170 (P3+P4): ping pro Dr. Lucas avisando que paciente confirmou.
  // Fire-and-forget — falha silenciosa.
  void pingConfirmadoDia(agendamentoId)

  return NextResponse.json({ ok: true, status: "confirmado" })
}
