import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

type ConversaQuery = {
  id: string
  leadId: string
  etapa: string
  modoConversa: string
  atendenteId: string | null
  ultimaMensagemEm: string | null
  lead: {
    id: string
    nome: string
    whatsapp: string
    statusFunil: string
    procedimentoInteresse: string | null
  } | null
  atendente: { id: string; nome: string } | null
  mensagens: Array<{
    id: string
    conteudo: string
    remetente: string
    tipo: string
    criadoEm: string
    lidaEm: string | null
  }>
}

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const filtro = searchParams.get("filtro") || "todas"
  const busca = searchParams.get("busca") || ""
  const userId = auth.session.user.id

  let query = supabaseAdmin
    .from("conversas")
    .select(`
      id,
      leadId,
      etapa,
      modoConversa,
      atendenteId,
      ultimaMensagemEm,
      lead:leads!conversas_leadId_fkey(id, nome, whatsapp, statusFunil, procedimentoInteresse),
      atendente:usuarios!conversas_atendenteId_fkey(id, nome),
      mensagens:mensagens_whatsapp(id, conteudo, remetente, tipo, criadoEm, lidaEm)
    `)
    .is("encerradaEm", null)

  if (filtro === "minhas") {
    query = query.eq("atendenteId", userId)
  }

  if (filtro === "pendentes") {
    query = query.eq("modoConversa", "ia")
  }

  const { data, error } = await query
    .order("ultimaMensagemEm", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let conversas = (data ?? []) as unknown as ConversaQuery[]

  if (filtro === "pendentes") {
    conversas = conversas.filter((c) =>
      c.mensagens.some((m) => m.remetente === "paciente" && m.lidaEm === null)
    )
  }

  if (busca) {
    const buscaLower = busca.toLowerCase()
    conversas = conversas.filter((c) => {
      const nome = c.lead?.nome?.toLowerCase() ?? ""
      const whatsapp = c.lead?.whatsapp ?? ""
      return nome.includes(buscaLower) || whatsapp.includes(busca)
    })
  }

  const resultado = conversas.map((c) => {
    const ultimaMensagem = [...c.mensagens]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0]
    const naoLidas = c.mensagens.filter(
      (m) => m.remetente === "paciente" && m.lidaEm === null
    ).length

    return {
      id: c.id,
      leadId: c.leadId,
      etapa: c.etapa,
      modoConversa: c.modoConversa,
      atendenteId: c.atendenteId,
      atendente: c.atendente,
      ultimaMensagemEm: c.ultimaMensagemEm,
      lead: c.lead,
      ultimaMensagem: ultimaMensagem
        ? {
            id: ultimaMensagem.id,
            conteudo: ultimaMensagem.conteudo,
            remetente: ultimaMensagem.remetente,
            tipo: ultimaMensagem.tipo,
            criadoEm: ultimaMensagem.criadoEm,
          }
        : null,
      naoLidas,
    }
  })

  return NextResponse.json({ conversas: resultado })
}
