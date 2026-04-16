import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q") ?? ""

  if (q.length < 2) {
    return NextResponse.json({ leads: [], agendamentos: [], procedimentos: [], total: 0 })
  }

  const [
    { data: leads },
    { data: agendamentos },
    { data: procedimentos },
  ] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id, nome, whatsapp, statusFunil")
      .is("deletadoEm", null)
      .eq("arquivado", false)
      .or(`nome.ilike.%${q}%,whatsapp.ilike.%${q}%`)
      .limit(5),
    supabaseAdmin
      .from("agendamentos")
      .select(
        "id, dataHora, status, lead:leads!agendamentos_leadId_fkey(nome), procedimento:procedimentos(nome)"
      )
      .ilike("lead.nome", `%${q}%`)
      .limit(5),
    supabaseAdmin
      .from("procedimentos")
      .select("id, nome, ativo")
      .is("deletadoEm", null)
      .ilike("nome", `%${q}%`)
      .limit(5),
  ])

  const leadsList = leads ?? []
  const agendamentosList = (agendamentos ?? []).filter((a) => a.lead)
  const procedimentosList = procedimentos ?? []

  return NextResponse.json({
    leads: leadsList,
    agendamentos: agendamentosList,
    procedimentos: procedimentosList,
    total: leadsList.length + agendamentosList.length + procedimentosList.length,
  })
}
