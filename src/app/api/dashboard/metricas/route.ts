import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { ETAPAS_FUNIL, FUNIL_CORES, FUNIL_LABELS } from "@/lib/funil"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const baseLeads = () =>
    supabaseAdmin
      .from("contatos")
      .select("id", { count: "exact", head: true })
      .is("deletadoEm", null)
      .eq("arquivado", false)
      .eq("tipo", "lead")

  const leadsPorEtapaP = supabaseAdmin
    .from("contatos")
    .select("statusFunil")
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .eq("tipo", "lead")

  const [totalLeadsRes, leadsPorEtapaRes] = await Promise.all([
    baseLeads(),
    leadsPorEtapaP,
  ])

  const etapaCount: Record<string, number> = {}
  for (const lead of leadsPorEtapaRes.data ?? []) {
    const etapa = lead.statusFunil
    if (!etapa) continue
    etapaCount[etapa] = (etapaCount[etapa] ?? 0) + 1
  }

  const leadsPorEtapa = ETAPAS_FUNIL.map((etapa) => ({
    etapa,
    label: FUNIL_LABELS[etapa] || etapa,
    total: etapaCount[etapa] ?? 0,
    cor: FUNIL_CORES[etapa] || "#94a3b8",
  }))

  return NextResponse.json({
    totalLeads: totalLeadsRes.count ?? 0,
    leadsPorEtapa,
  })
}
