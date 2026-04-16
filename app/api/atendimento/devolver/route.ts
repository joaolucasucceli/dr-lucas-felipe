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
    .select("id, leadId, modoConversa")
    .eq("id", parse.data.conversaId)
    .maybeSingle()

  if (!conversa) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  if (conversa.modoConversa === "ia") {
    return NextResponse.json({ error: "Conversa já está em modo IA" }, { status: 400 })
  }

  const { data: usuarioIa } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("tipo", "ia")
    .eq("ativo", true)
    .is("deletadoEm", null)
    .maybeSingle()

  const { error: convError } = await supabaseAdmin
    .from("conversas")
    .update({
      modoConversa: "ia",
      atendenteId: null,
      atualizadoEm: agora(),
    })
    .eq("id", conversa.id)

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from("leads")
    .update({ responsavelId: usuarioIa?.id || null, atualizadoEm: agora() })
    .eq("id", conversa.leadId)

  return NextResponse.json({ sucesso: true, modoConversa: "ia" })
}
