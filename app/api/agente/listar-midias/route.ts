import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"

/** JLAU-570: lista midias disponiveis para a IA escolher por descricao.
 *  Retorna payload enxuto (sem URL do storage — so metadata que a IA precisa).
 *  Inclui flag `jaEnviada` quando `conversaId` e informado,
 *  para evitar que a IA repita a mesma midia na mesma conversa. */
export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  const body = await request.json()
  const { categoria, procedimento, conversaId } = body as {
    categoria?: string
    procedimento?: string
    conversaId?: string
  }

  if (!categoria) {
    return NextResponse.json(
      { error: "categoria obrigatoria" },
      { status: 400 }
    )
  }

  let query = supabaseAdmin
    .from("midia_marketing")
    .select("id, titulo, descricao, tipo, categoria, procedimento")
    .eq("categoria", categoria)
    .eq("ativo", true)
    .is("deletadoEm", null)

  if (procedimento) {
    query = query.eq("procedimento", procedimento)
  }

  const { data: midias } = await query

  if (!midias || midias.length === 0) {
    return NextResponse.json({ ok: true, midias: [] })
  }

  // Marca quais midias ja foram enviadas nessa conversa
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
      const { data: midiasComUrl } = await supabaseAdmin
        .from("midia_marketing")
        .select("id, url")
        .in("id", midias.map((m) => m.id))

      idsEnviadas = new Set(
        (midiasComUrl ?? [])
          .filter((m) => urlsEnviadas.has(m.url))
          .map((m) => m.id)
      )
    }
  }

  const midiasEnriquecidas = midias.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    descricao: m.descricao ?? "",
    tipo: m.tipo,
    categoria: m.categoria,
    procedimento: m.procedimento,
    jaEnviada: idsEnviadas.has(m.id),
  }))

  return NextResponse.json({ ok: true, midias: midiasEnriquecidas })
}
