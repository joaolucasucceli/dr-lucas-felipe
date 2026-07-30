import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { criarMidiaMarketingSchema } from "@/lib/validations/midia-marketing"
import { midiaMarketingExisteNoStorage } from "@/lib/agente/midia-marketing-storage"
import { criarId, agora } from "@/lib/db-utils"

export async function GET(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const busca = searchParams.get("busca")

  let query = supabaseAdmin
    .from("midia_marketing")
    .select("*")
    .is("deletadoEm", null)

  if (busca) query = query.ilike("descricao", `%${busca}%`)

  const { data, error } = await query.order("criadoEm", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Estado real do arquivo, por registro (OPE-559). Sem isto a tela mostrava
  // como saudável uma mídia que a Ana Júlia nunca conseguiria enviar, e o
  // Dr. Lucas não tinha como saber que os resultados dele estavam fora do ar —
  // o descarte só existia em `console.warn`.
  //
  // Usa a MESMA função do caminho de envio, de propósito: se um dia as duas
  // divergirem, a tela volta a mentir. O custo é uma checagem por mídia, em
  // paralelo — o mesmo que o agente já paga a cada envio, e aqui só quando
  // alguém abre a tela.
  const midias = data ?? []
  const arquivos = await Promise.all(
    midias.map((midia) => midiaMarketingExisteNoStorage(midia.url))
  )

  return NextResponse.json({
    dados: midias.map((midia, indice) => ({
      ...midia,
      arquivoOk: arquivos[indice],
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = criarMidiaMarketingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: midia, error } = await supabaseAdmin
    .from("midia_marketing")
    .insert({ id: criarId(), atualizadoEm: agora(), ...parsed.data })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(midia, { status: 201 })
}
