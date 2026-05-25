import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

// JLU-171 (E 25/05): "Evolucoes recentes" card no dashboard pro Dr. Lucas
// ver de relance as ultimas notas medicas com link rapido pro prontuario
// do paciente.
export async function GET() {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from("evolucoes")
    .select(
      "id, titulo, tipo, conteudo, dataRegistro, prontuarioId, " +
        "prontuario:prontuarios(id, contatoId, contato:contatos(id, nome))"
    )
    .is("deletadoEm", null)
    .order("dataRegistro", { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ evolucoes: data ?? [] })
}
