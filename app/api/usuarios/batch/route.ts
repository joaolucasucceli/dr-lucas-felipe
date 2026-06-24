import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { agora } from "@/lib/db-utils"

const schema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  acao: z.literal("excluir"),
})

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { ids } = parsed.data

  // Protecao: nunca afetar o proprio usuario.
  const idsFiltrados = ids.filter((id) => id !== auth.session.user.id)
  if (idsFiltrados.length === 0) {
    return NextResponse.json(
      { error: "Nenhum usuário válido selecionado (não é possível excluir seu próprio usuário)" },
      { status: 400 }
    )
  }

  // Reapontar contatos antes do soft-delete para "sem humano".
  const tsAgora = agora()
  await supabaseAdmin
    .from("contatos")
    .update({ responsavelId: null, atualizadoEm: tsAgora })
    .in("responsavelId", idsFiltrados)

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .update({ deletadoEm: tsAgora, ativo: false, atualizadoEm: tsAgora })
    .in("id", idsFiltrados)
    .neq("tipo", "ia")
    .is("deletadoEm", null)
    .select("id")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: data?.length ?? 0, total: ids.length })
}
