import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getSession } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  if (session.user.perfil !== "gestor") {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200)
  const apenasDivergentes = searchParams.get("apenasDivergentes") === "true"

  const { data, error } = await supabaseAdmin
    .from("analista_logs")
    .select(
      "id, leadId, conversaId, historicoMensagens, estadoAtualLead, output, divergencias, aplicado, confiancaGeral, erro, criadoEm, leads:leadId(nome, whatsapp)"
    )
    .order("criadoEm", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[analista-logs] Erro ao buscar:", error)
    return NextResponse.json({ error: "Erro ao buscar logs" }, { status: 500 })
  }

  const logs = (data ?? []) as Array<{
    divergencias: unknown[]
    [key: string]: unknown
  }>

  const filtrados = apenasDivergentes
    ? logs.filter((l) => Array.isArray(l.divergencias) && l.divergencias.length > 0)
    : logs

  return NextResponse.json({ logs: filtrados, total: filtrados.length })
}
