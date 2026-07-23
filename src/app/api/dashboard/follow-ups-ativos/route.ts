import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { instanteDoBanco } from "@/lib/db-utils"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const { data: contatosRaw } = await supabaseAdmin
    .from("contatos")
    .select(`
      id,
      nome,
      statusFunil,
      procedimentoInteresse,
      conversas(followUpEnviados, ultimaMensagemEm, encerradaEm, criadoEm)
    `)
    .is("deletadoEm", null)
    .eq("tipo", "lead")
    .eq("arquivado", false)
    .limit(50)

  type ContatoComConversas = {
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

  const contatosComFollowUp = ((contatosRaw ?? []) as unknown as ContatoComConversas[])
    .map((contato) => {
      const conversaAberta = contato.conversas
        .filter((c) => !c.encerradaEm && (c.followUpEnviados ?? []).length > 0)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0]

      if (!conversaAberta) return null

      return {
        id: contato.id,
        nome: contato.nome,
        statusFunil: contato.statusFunil,
        procedimentoInteresse: contato.procedimentoInteresse,
        followUpEnviados: conversaAberta.followUpEnviados ?? [],
        ultimaMensagemEm: conversaAberta.ultimaMensagemEm,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => {
      if (!a.ultimaMensagemEm) return 1
      if (!b.ultimaMensagemEm) return -1
      return instanteDoBanco(a.ultimaMensagemEm) - instanteDoBanco(b.ultimaMensagemEm)
    })

  return NextResponse.json({
    contatos: contatosComFollowUp.slice(0, 5),
    total: contatosComFollowUp.length,
  })
}
