import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { filtro?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  let query = supabaseAdmin
    .from("procedimentos")
    // NENHUM campo de valor e selecionado de proposito. Ver comentario abaixo.
    .select("id, nome, tipo, descricao, duracaoMin, posOperatorio, parcelamento, escopoOferta")
    .eq("ativo", true)
    .is("deletadoEm", null)

  if (body.filtro) {
    query = query.ilike("nome", `%${body.filtro}%`)
  }

  const { data: procedimentos, error } = await query.order("nome", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // A Ana Julia NAO recebe valor nenhum por esta rota — nem faixa, nem valor
  // base, nem estimado. Decisao do Dr. Lucas (audio de 14/07/2026), executada
  // em 22/07/2026: a estimativa automatica dava a faixa GENERICA do
  // procedimento (R$ 8k a 11k da mini lipo) independentemente da regiao do
  // paciente, porque `extrairEstimativaDaConsulta` pegava o primeiro item da
  // lista. Ele reclamou que "esse valor nao e de acordo" e definiu o fluxo:
  // foto -> caso vai pro Dr. Lucas -> ele responde o valor -> Ana envia.
  //
  // A correcao de raiz e cortar o numero na ORIGEM: se a faixa nunca chega ao
  // modelo, nenhuma mudanca de prompt pode fazer a IA emitir preco chutado.
  // Preco por regiao vive em `procedimento_regioes` e serve ao Dr. Lucas
  // (referencia interna ao definir o orcamento), nunca ao paciente.

  return NextResponse.json({ procedimentos: procedimentos ?? [] })
}
