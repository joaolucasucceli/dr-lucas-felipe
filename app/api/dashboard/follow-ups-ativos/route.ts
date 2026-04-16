import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const { data: leadsRaw } = await supabaseAdmin
    .from("leads")
    .select(`
      id,
      nome,
      statusFunil,
      procedimentoInteresse,
      conversas(followUpEnviados, ultimaMensagemEm, encerradaEm, criadoEm)
    `)
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .limit(50)

  type LeadComConversas = {
    id: string
    nome: string
    statusFunil: string
    procedimentoInteresse: string | null
    conversas: Array<{
      followUpEnviados: string[] | null
      ultimaMensagemEm: string | null
      encerradaEm: string | null
      criadoEm: string
    }>
  }

  const leadsComFollowUp = ((leadsRaw ?? []) as unknown as LeadComConversas[])
    .map((lead) => {
      const conversaAberta = lead.conversas
        .filter((c) => !c.encerradaEm && (c.followUpEnviados ?? []).length > 0)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0]

      if (!conversaAberta) return null

      return {
        id: lead.id,
        nome: lead.nome,
        statusFunil: lead.statusFunil,
        procedimentoInteresse: lead.procedimentoInteresse,
        followUpEnviados: conversaAberta.followUpEnviados ?? [],
        ultimaMensagemEm: conversaAberta.ultimaMensagemEm,
      }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)
    .sort((a, b) => {
      if (!a.ultimaMensagemEm) return 1
      if (!b.ultimaMensagemEm) return -1
      return new Date(a.ultimaMensagemEm).getTime() - new Date(b.ultimaMensagemEm).getTime()
    })

  return NextResponse.json({
    leads: leadsComFollowUp.slice(0, 5),
    total: leadsComFollowUp.length,
  })
}
