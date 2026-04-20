import { createHash } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { agora } from "@/lib/db-utils"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ contatoId: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { contatoId } = await params

  const { data: lead } = await supabaseAdmin
    .from("contatos")
    .select("id, whatsapp, deletadoEm")
    .eq("id", contatoId)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  if (lead.deletadoEm) {
    return NextResponse.json({ error: "Lead já anonimizado" }, { status: 409 })
  }

  if (!lead.whatsapp) {
    return NextResponse.json({ error: "Contato sem WhatsApp" }, { status: 400 })
  }

  const whatsappHash = createHash("sha256").update(lead.whatsapp).digest("hex")

  const { error: updateError } = await supabaseAdmin
    .from("contatos")
    .update({
      nome: "Usuário Anonimizado",
      whatsapp: whatsappHash,
      email: null,
      sobreOPaciente: null,
      deletadoEm: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", contatoId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from("mensagens_whatsapp")
    .delete()
    .eq("contatoId", contatoId)

  return NextResponse.json({ ok: true })
}
