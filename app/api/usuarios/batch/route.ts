import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { agora } from "@/lib/db-utils"

const schema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  acao: z.enum(["ativar", "desativar", "excluir"]),
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

  const { ids, acao } = parsed.data

  // Protecoes: nunca afetar o proprio usuario nem o usuario IA
  const idsFiltrados = ids.filter((id) => id !== auth.session.user.id)
  if (idsFiltrados.length === 0) {
    return NextResponse.json(
      { error: "Nenhum usuário válido selecionado (não é possível alterar seu próprio usuário)" },
      { status: 400 }
    )
  }

  const dadosUpdate =
    acao === "excluir"
      ? { deletadoEm: agora(), ativo: false, atualizadoEm: agora() }
      : acao === "ativar"
        ? { ativo: true, atualizadoEm: agora() }
        : { ativo: false, atualizadoEm: agora() }

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .update(dadosUpdate)
    .in("id", idsFiltrados)
    .neq("tipo", "ia")
    .is("deletadoEm", null)
    .select("id")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: data?.length ?? 0, total: ids.length })
}
