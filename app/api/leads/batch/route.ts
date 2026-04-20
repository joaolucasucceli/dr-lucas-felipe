import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole, requireAnyRole } from "@/lib/auth-helpers"
import {
  limparDependenciasDoLead,
  anonimizarWhatsapp,
} from "@/lib/leads/limpar-dependencias"
import { agora } from "@/lib/db-utils"

const schema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  acao: z.enum(["excluir", "arquivar", "desarquivar"]),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { ids, acao } = parsed.data

  if (acao === "excluir") {
    const authGestor = await requireRole("gestor")
    if (authGestor.error) return authGestor.error

    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select("id, whatsapp")
      .in("id", ids)
      .is("deletadoEm", null)

    let sucesso = 0
    const falhas: string[] = []

    for (const lead of leads ?? []) {
      const chatId = lead.whatsapp ? `${lead.whatsapp}@s.whatsapp.net` : null
      try {
        await limparDependenciasDoLead({ leadId: lead.id, chatId })
        const whatsappAnonimo = lead.whatsapp
          ? anonimizarWhatsapp(lead.whatsapp, lead.id)
          : null
        const { error } = await supabaseAdmin
          .from("leads")
          .update({
            deletadoEm: agora(),
            atualizadoEm: agora(),
            ...(whatsappAnonimo ? { whatsapp: whatsappAnonimo } : {}),
          })
          .eq("id", lead.id)
        if (error) throw error
        sucesso++
      } catch (err) {
        console.error(`[leads/batch excluir] ${lead.id}:`, err)
        falhas.push(lead.id)
      }
    }

    return NextResponse.json({ sucesso, falhas, total: ids.length })
  }

  const authEditor = await requireAnyRole(["gestor", "atendente"])
  if (authEditor.error) return authEditor.error

  const arquivado = acao === "arquivar"
  const { data, error } = await supabaseAdmin
    .from("leads")
    .update({
      arquivado,
      arquivadoEm: arquivado ? agora() : null,
      atualizadoEm: agora(),
    })
    .in("id", ids)
    .is("deletadoEm", null)
    .select("id")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: data?.length ?? 0, total: ids.length })
}
