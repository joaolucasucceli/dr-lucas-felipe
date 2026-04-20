import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

const ETAPAS_FUNIL: string[] = [
  "acolhimento",
  "qualificacao",
  "agendamento",
  "consulta_agendada",
]

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const responsavelId = searchParams.get("responsavelId")
  const procedimentoInteresse = searchParams.get("procedimentoInteresse")

  let query = supabaseAdmin
    .from("leads")
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
      responsavel:usuarios!leads_responsavelId_fkey(id, nome),
      conversas(followUpEnviados, encerradaEm, criadoEm, modoConversa)
    `)
    .is("deletadoEm", null)
    .eq("arquivado", false)

  if (responsavelId) {
    query = query.eq("responsavelId", responsavelId)
  }

  if (procedimentoInteresse) {
    query = query.ilike("procedimentoInteresse", `%${procedimentoInteresse}%`)
  }

  const { data: leads, error } = await query.order("atualizadoEm", { ascending: false })

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

  type LeadKanban = {
    id: string
    nome: string
    whatsapp: string
    procedimentoInteresse: string | null
    statusFunil: string
    criadoEm: string
    atualizadoEm: string
    ultimaMovimentacaoEm: string | null
    ehRetorno: boolean
    cicloAtual: number
    responsavel: { id: string; nome: string } | null
    conversas: ConversaComFollowUp[]
  }

  for (const lead of (leads ?? []) as unknown as LeadKanban[]) {
    const { conversas, ...resto } = lead
    const referencia = lead.ultimaMovimentacaoEm || lead.atualizadoEm
    const diasNaEtapa = Math.floor((agora - new Date(referencia).getTime()) / 86400000)

    const conversaAberta = (conversas ?? [])
      .filter((c) => !c.encerradaEm)
      .sort((a, b) => (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""))[0]

    if (!colunas[lead.statusFunil]) {
      colunas[lead.statusFunil] = []
    }

    colunas[lead.statusFunil].push({
      ...resto,
      diasNaEtapa,
      followUpEnviados: conversaAberta?.followUpEnviados ?? [],
      iaPausada: conversaAberta?.modoConversa === "humano",
    })
  }

  return NextResponse.json({
    colunas,
    total: leads?.length ?? 0,
  })
}
