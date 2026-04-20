import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { agora } from "@/lib/db-utils"
import { z } from "zod"

const schema = z.object({
  conversaId: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "conversaId obrigatório" }, { status: 400 })
  }

  const { data: conversa } = await supabaseAdmin
    .from("conversas")
    .select("id, contatoId, modoConversa")
    .eq("id", parse.data.conversaId)
    .maybeSingle()

  if (!conversa) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  if (conversa.modoConversa === "humano") {
    return NextResponse.json({ error: "IA já está pausada nesta conversa" }, { status: 400 })
  }

  const { error: convError } = await supabaseAdmin
    .from("conversas")
    .update({
      modoConversa: "humano",
      atendenteId: auth.session.user.id,
      atualizadoEm: agora(),
    })
    .eq("id", conversa.id)

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from("contatos")
    .update({ responsavelId: auth.session.user.id, atualizadoEm: agora() })
    .eq("id", conversa.contatoId)

  return NextResponse.json({ sucesso: true, modoConversa: "humano" })
}
