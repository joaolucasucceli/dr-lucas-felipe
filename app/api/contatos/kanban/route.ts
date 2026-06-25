import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { ETAPAS_FUNIL } from "@/lib/funil"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const procedimentoInteresse = searchParams.get("procedimentoInteresse")

  let query = supabaseAdmin
    .from("contatos")
    .select(`
      id,
      nome,
      whatsapp,
      procedimentoInteresse,
      statusFunil,
      criadoEm,
      atualizadoEm,
      ultimaMovimentacaoEm,
      ehRetorno,
      cicloAtual,
      responsavel:usuarios!contatos_responsavelId_fkey(id, nome),
      conversas(followUpEnviados, encerradaEm, criadoEm, modoConversa)
    `)
    .is("deletadoEm", null)
    .eq("tipo", "lead")
    .eq("arquivado", false)

  if (procedimentoInteresse) {
    query = query.ilike("procedimentoInteresse", `%${procedimentoInteresse}%`)
  }

  const { data: contatos, error } = await query.order("atualizadoEm", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const agora = Date.now()
  const colunas: Record<string, unknown[]> = {}

  for (const etapa of ETAPAS_FUNIL) {
    colunas[etapa] = []
  }

  type ConversaComFollowUp = {
    followUpEnviados?: string[] | null
    encerradaEm?: string | null
    criadoEm?: string | null
    modoConversa?: "ia" | "humano" | null
  }

  type ContatoKanban = {
    id: string
    nome: string
    whatsapp: string
    procedimentoInteresse: string | null
    statusFunil: string | null
    criadoEm: string
    atualizadoEm: string
    ultimaMovimentacaoEm: string | null
    ehRetorno: boolean
    cicloAtual: number
    responsavel: { id: string; nome: string } | null
    conversas: ConversaComFollowUp[]
  }

  for (const contato of (contatos ?? []) as unknown as ContatoKanban[]) {
    const { conversas, ...resto } = contato
    const referencia = contato.ultimaMovimentacaoEm || contato.atualizadoEm
    const diasNaEtapa = Math.floor((agora - new Date(referencia).getTime()) / 86400000)

    const conversaAberta = (conversas ?? [])
      .filter((c) => !c.encerradaEm)
      .sort((a, b) => (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""))[0]

    const statusFunil = contato.statusFunil || "acolhimento"

    if (!colunas[statusFunil]) {
      colunas[statusFunil] = []
    }

    colunas[statusFunil].push({
      ...resto,
      statusFunil,
      diasNaEtapa,
      followUpEnviados: conversaAberta?.followUpEnviados ?? [],
      iaPausada: conversaAberta?.modoConversa === "humano",
    })
  }

  return NextResponse.json({
    colunas,
    total: contatos?.length ?? 0,
  })
}
