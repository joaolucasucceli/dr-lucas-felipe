import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

// JLU-170 v2 (B 25/05): GET lista aprovacoes pendentes/historico pro gestor.
export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const status = searchParams.get("status") ?? "aguardando"
  const limite = Number(searchParams.get("limite") ?? "100")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any
  const { data, error } = await sb
    .from("aprovacoes_agendamento")
    .select(
      "id, dataHora, status, criadoEm, respondidoEm, motivoRejeicao, agendamentoCriadoId, contatoId, conversaId, email, observacao, " +
        "contato:contatos(id, nome, whatsapp), " +
        "procedimento:procedimentos(id, nome, escopoOferta)"
    )
    .eq("status", status as never)
    .order("criadoEm", { ascending: false })
    .limit(Math.min(limite, 200))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ aprovacoes: data ?? [] })
}
