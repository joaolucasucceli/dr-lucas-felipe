import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const agoraTs = new Date()
  const tressDiasAtras = new Date(agoraTs.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const vintQuatroHorasAtras = new Date(agoraTs.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data: usuarioIA } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("email", "ia@drlucas.com.br")
    .maybeSingle()

  const [
    { data: leadsAlerta },
    leadsNovosIAResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id, nome, statusFunil, ultimaMovimentacaoEm")
      .is("deletadoEm", null)
      .eq("arquivado", false)
      .lt("ultimaMovimentacaoEm", tressDiasAtras)
      .limit(5),
    usuarioIA
      ? supabaseAdmin
          .from("leads")
          .select("id, nome, criadoEm")
          .eq("responsavelId", usuarioIA.id)
          .gte("criadoEm", vintQuatroHorasAtras)
          .order("criadoEm", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string; criadoEm: string }> }),
  ])

  const leadsNovosIA = leadsNovosIAResult.data ?? []

  const total =
    (leadsAlerta?.length ?? 0) +
    leadsNovosIA.length

  return NextResponse.json({
    leadsAlerta: leadsAlerta ?? [],
    leadsNovosIA,
    total,
  })
}
