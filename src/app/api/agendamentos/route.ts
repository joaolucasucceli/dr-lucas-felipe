import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

// Sistema 100% autonomo — agendamentos sao criados EXCLUSIVAMENTE pela
// Ana Julia via WhatsApp atraves de POST /api/agente/registrar-agendamento.
// Este endpoint manual foi descontinuado pra forcar todo lead pelo funil
// da IA. Edicao/remarcacao/cancelamento manual continuam disponiveis em
// /api/agendamentos/[id] (PATCH/DELETE) pra uso operacional do gestor.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Criacao manual de agendamento foi descontinuada. Os agendamentos sao feitos exclusivamente pela Ana Julia via WhatsApp.",
    },
    { status: 410 }
  )
}

// JLU-171 (P1 pedido Dr. Lucas 25/05): listagem de agendamentos com filtros.
// Default lista TODOS; ?contatoId pra agendamentos de um paciente especifico.
export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const status = searchParams.get("status")
  const contatoId = searchParams.get("contatoId")
  const ordem = searchParams.get("ordem") || "desc"
  const limite = Number(searchParams.get("limite") || "100")

  let query = supabaseAdmin
    .from("agendamentos")
    .select(
      "id, dataHora, status, observacao, contatoId, procedimentoId, criadoEm, " +
        "contato:contatos(id, nome, whatsapp, tipo), " +
        "procedimento:procedimentos(id, nome, escopoOferta)"
    )

  if (status) query = query.eq("status", status as never)
  if (contatoId) query = query.eq("contatoId", contatoId)

  const { data, error } = await query
    .order("dataHora", { ascending: ordem === "asc" })
    .limit(Math.min(limite, 500))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agendamentos: data ?? [], total: data?.length ?? 0 })
}
