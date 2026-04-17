import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"

/** JLAU-570 (simplificado): lista TODAS as midias ativas com {id, descricao, jaEnviada}.
 *  A IA escolhe qual enviar baseada apenas na descricao. */
export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  const body = await request.json()
  const { conversaId } = body as { conversaId?: string }

  const { data: midias } = await supabaseAdmin
    .from("midia_marketing")
    .select("id, descricao, url")
    .eq("ativo", true)
    .is("deletadoEm", null)

  if (!midias || midias.length === 0) {
    return NextResponse.json({ ok: true, midias: [] })
  }

  let idsEnviadas = new Set<string>()
  if (conversaId) {
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

  const midiasEnriquecidas = midias.map((m) => ({
    id: m.id,
    descricao: m.descricao,
    jaEnviada: idsEnviadas.has(m.id),
  }))

  return NextResponse.json({ ok: true, midias: midiasEnriquecidas })
}
