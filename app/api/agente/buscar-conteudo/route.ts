import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"

/** JLAU-1042: busca unificada de conteudo da IA.
 *  Retorna textos da base de conhecimento + midias de marketing relevantes
 *  ao filtro. A IA decide o que parafrasear e o que enviar via enviar_midia. */
export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { filtro?: string; conversaId?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const { filtro, conversaId } = body

  // === TEXTOS: base_conhecimento ===
  let queryTextos = supabaseAdmin
    .from("base_conhecimento")
    .select("titulo, conteudo")
    .is("deletadoEm", null)

  if (filtro) {
    queryTextos = queryTextos.or(
      `titulo.ilike.%${filtro}%,conteudo.ilike.%${filtro}%`
    )
  }

  const { data: textos, error: erroTextos } = await queryTextos.order("titulo", {
    ascending: true,
  })

  if (erroTextos) {
    return NextResponse.json({ error: erroTextos.message }, { status: 500 })
  }

  // === MIDIAS: midia_marketing ===
  let queryMidias = supabaseAdmin
    .from("midia_marketing")
    .select("id, descricao, url")
    .is("deletadoEm", null)

  if (filtro) {
    queryMidias = queryMidias.ilike("descricao", `%${filtro}%`)
  }

  const { data: midias, error: erroMidias } = await queryMidias

  if (erroMidias) {
    return NextResponse.json({ error: erroMidias.message }, { status: 500 })
  }

  // === jaEnviada: cruzar com mensagens_whatsapp da conversa ===
  let idsEnviadas = new Set<string>()
  if (conversaId && midias && midias.length > 0) {
    const { data: enviadas } = await supabaseAdmin
      .from("mensagens_whatsapp")
      .select("mediaUrl")
      .eq("conversaId", conversaId)
      .eq("remetente", "agente")
      .not("mediaUrl", "is", null)

    const urlsEnviadas = new Set(
      (enviadas ?? []).map((m) => m.mediaUrl).filter((u): u is string => !!u)
    )

    if (urlsEnviadas.size > 0) {
      idsEnviadas = new Set(
        midias.filter((m) => urlsEnviadas.has(m.url)).map((m) => m.id)
      )
    }
  }

  const midiasEnriquecidas = (midias ?? []).map((m) => ({
    id: m.id,
    descricao: m.descricao,
    jaEnviada: idsEnviadas.has(m.id),
  }))

  return NextResponse.json({
    textos: textos ?? [],
    midias: midiasEnriquecidas,
    totalTextos: textos?.length ?? 0,
    totalMidias: midiasEnriquecidas.length,
  })
}
