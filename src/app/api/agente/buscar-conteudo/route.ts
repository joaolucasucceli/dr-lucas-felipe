import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { filtrarMidiasComArquivo } from "@/lib/agente/midia-marketing-storage"
import { ordenarPorRelevancia } from "@/lib/agente/relevancia-conteudo"

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
  //
  // Sem filtro no banco, de propósito (OPE-555). A busca era `ilike` literal e
  // errava por acento, hífen e por exigir a frase contígua: a Ana disse duas
  // vezes que não tinha encontrado o pós-operatório com o registro cadastrado.
  // A relação entre a pergunta e o registro é de interpretação — todo
  // procedimento tem material de pós-operatório — e casar string não cobre
  // isso. Carregamos a base (pequena) e ordenamos por relevância; quem escolhe
  // o que responde é o modelo.
  const { data: todosTextos, error: erroTextos } = await supabaseAdmin
    .from("base_conhecimento")
    .select("titulo, conteudo")
    .is("deletadoEm", null)
    .order("titulo", { ascending: true })

  if (erroTextos) {
    return NextResponse.json({ error: erroTextos.message }, { status: 500 })
  }

  const textos = ordenarPorRelevancia(
    (todosTextos ?? []).map((texto) => ({
      ...texto,
      textoParaBusca: `${texto.titulo} ${texto.conteudo}`,
      peso: (texto.titulo?.length ?? 0) + (texto.conteudo?.length ?? 0),
    })),
    filtro
  ).map(({ titulo, conteudo }) => ({ titulo, conteudo }))

  // === MIDIAS: midia_marketing ===
  //
  // Mesma mudança dos textos (OPE-555): o `ilike` na descrição também errava
  // por acento. O catálogo já vinha inteiro no fallback — agora vem sempre,
  // ordenado por relevância, e o modelo decide se alguma serve. A regra de não
  // enviar mídia que não bate com o caso continua no prompt.
  // Só `comparativo` (antes e depois na mesma imagem) pode ser oferecido a um
  // lead. Foto de antes isolada e registro cirúrgico ficam de fora — ver
  // OPE-553 e o comentário da coluna `tipo`.
  const { data: todasMidias, error: erroMidias } = await supabaseAdmin
    .from("midia_marketing")
    .select("id, descricao, url")
    .eq("tipo", "comparativo")
    .is("deletadoEm", null)

  if (erroMidias) {
    return NextResponse.json({ error: erroMidias.message }, { status: 500 })
  }

  let midiasFinais = ordenarPorRelevancia(
    (todasMidias ?? []).map((midia) => ({
      ...midia,
      textoParaBusca: midia.descricao ?? "",
      peso: (midia.descricao?.length ?? 0) + 40,
    })),
    filtro
  ).map(({ id, descricao, url }) => ({ id, descricao, url }))

  midiasFinais = await filtrarMidiasComArquivo(
    midiasFinais,
    filtro ? `filtro="${filtro}"` : "sem filtro"
  )

  // === jaEnviada: cruzar com mensagens_whatsapp da conversa ===
  let idsEnviadas = new Set<string>()
  if (conversaId && midiasFinais.length > 0) {
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
        midiasFinais.filter((m) => urlsEnviadas.has(m.url)).map((m) => m.id)
      )
    }
  }

  const midiasEnriquecidas = midiasFinais.map((m) => ({
    id: m.id,
    descricao: m.descricao,
    jaEnviada: idsEnviadas.has(m.id),
  }))

  return NextResponse.json({
    textos,
    midias: midiasEnriquecidas,
    totalTextos: textos.length,
    totalMidias: midiasEnriquecidas.length,
    // Textos e mídias vêm SEMPRE ordenados por relevância ao filtro, do mais
    // provável para o menos. Nada é escondido do modelo por não ter casado
    // string — ver `relevancia-conteudo.ts` (OPE-555).
    ordenadoPorRelevancia: true,
  })
}
