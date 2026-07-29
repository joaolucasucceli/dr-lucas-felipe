import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { agora } from "@/lib/db-utils"

const schema = z.object({
  contatoId: z.string().min(1),
  conversaId: z.string().optional(),
  motivo: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { contatoId, conversaId, motivo } = parsed.data
  const tsAgora = agora()

  const { data: conversa } = conversaId
    ? await supabaseAdmin
        .from("conversas")
        .select("id")
        .eq("id", conversaId)
        .eq("contatoId", contatoId)
        .maybeSingle()
    : await supabaseAdmin
        .from("conversas")
        .select("id")
        .eq("contatoId", contatoId)
        .is("encerradaEm", null)
        .order("criadoEm", { ascending: false })
        .limit(1)
        .maybeSingle()

  const updateContato: Record<string, unknown> = {
    responsavelId: "usr-lucas",
    statusFunil: "atendimento_humano",
    ultimaMovimentacaoEm: tsAgora,
    atualizadoEm: tsAgora,
  }

  if (motivo?.trim()) {
    const { data: contato } = await supabaseAdmin
      .from("contatos")
      .select("sobreOPaciente")
      .eq("id", contatoId)
      .maybeSingle()

    const nota = `Pedido de atendimento humano: ${motivo.trim()}`
    updateContato.sobreOPaciente = [contato?.sobreOPaciente, nota]
      .filter(Boolean)
      .join("\n---\n")
  }

  const { error: contatoError } = await supabaseAdmin
    .from("contatos")
    .update(updateContato as never)
    .eq("id", contatoId)

  if (contatoError) {
    return NextResponse.json({ error: contatoError.message }, { status: 500 })
  }

  if (conversa) {
    const { error: conversaError } = await supabaseAdmin
      .from("conversas")
      .update({
        modoConversa: "humano",
        // `conversas.etapa` fica onde estava, de proposito — voltar do handoff
        // na etapa anterior e o comportamento CORRETO, nao um defeito. Ela e o
        // ponto de retorno que `retomar-ia` le via `etapaRetornoIASegura`, e
        // "atendimento_humano" nao esta em ETAPAS_RETORNO_IA: gravar aqui fazia
        // o retorno cair em "qualificacao" e a Ana pedir regiao e foto de quem
        // ja tinha reuniao marcada. Como o freio de emergencia chama esta rota,
        // qualquer paciente que estourasse o teto voltaria rebobinado.
        //
        // A pausa e garantida por `contatos.statusFunil = atendimento_humano` +
        // `responsavelId`, abaixo. Revisao de 29/07/2026, depois da OPE-561.
        atendenteId: "usr-lucas",
        atualizadoEm: tsAgora,
      })
      .eq("id", conversa.id)

    if (conversaError) {
      return NextResponse.json({ error: conversaError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    modoConversa: "humano",
    statusFunil: "atendimento_humano",
  })
}
