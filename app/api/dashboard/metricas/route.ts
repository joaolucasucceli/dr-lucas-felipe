import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

const labelsFunil: Record<string, string> = {
  acolhimento: "Acolhimento",
  qualificacao: "Qualificação",
  agendamento: "Agendamento",
  consulta_agendada: "Reunião Agendada",
}

const coresFunil: Record<string, string> = {
  acolhimento: "#a1a1aa",
  qualificacao: "#93c5fd",
  agendamento: "#a5b4fc",
  consulta_agendada: "#c4b5fd",
}

const ordemFunil = [
  "acolhimento",
  "qualificacao",
  "agendamento",
  "consulta_agendada",
]

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

  const leadsPorEtapa = ordemFunil.map((etapa) => ({
    etapa,
    label: labelsFunil[etapa] || etapa,
    total: etapaCount[etapa] ?? 0,
    cor: coresFunil[etapa] || "#94a3b8",
  }))

  return NextResponse.json({
    totalLeads: totalLeadsRes.count ?? 0,
    leadsPorEtapa,
  })
}
