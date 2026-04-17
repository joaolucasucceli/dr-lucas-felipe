import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const conversaId = searchParams.get("conversaId")
  const cursor = searchParams.get("cursor")
  const limite = Math.min(Number(searchParams.get("limite")) || 50, 100)

  if (!conversaId) {
    return NextResponse.json({ error: "conversaId obrigatório" }, { status: 400 })
  }

  let cursorTimestamp: string | null = null

  if (cursor) {
    const { data: cursorMsg } = await supabaseAdmin
      .from("mensagens_whatsapp")
      .select("criadoEm")
      .eq("id", cursor)
      .maybeSingle()
    if (cursorMsg) {
      cursorTimestamp = cursorMsg.criadoEm
    }
  }

  let query = supabaseAdmin
    .from("mensagens_whatsapp")
    .select(`
      *,
      replyTo:mensagens_whatsapp!replyToId(id, conteudo, remetente)
    `)
    .eq("conversaId", conversaId)

  if (cursorTimestamp) {
    query = query.lt("criadoEm", cursorTimestamp)
  }

  const { data, error } = await query
    .order("criadoEm", { ascending: false })
    .limit(limite + 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const mensagens = data ?? []
  const temMais = mensagens.length > limite
  if (temMais) mensagens.pop()

  mensagens.reverse()

  return NextResponse.json({
    mensagens,
    proximoCursor: temMais ? mensagens[0]?.id : null,
  })
}
