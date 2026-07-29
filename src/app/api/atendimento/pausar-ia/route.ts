import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { agora } from "@/lib/db-utils"
import { z } from "zod"

const schema = z.object({
  conversaId: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parse = schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: "conversaId obrigatório" }, { status: 400 })
  }

  const { data: conversa } = await supabaseAdmin
    .from("conversas")
    .select("id, contatoId, modoConversa")
    .eq("id", parse.data.conversaId)
    .maybeSingle()

  if (!conversa) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  if (conversa.modoConversa === "humano") {
    return NextResponse.json({ error: "IA já está pausada nesta conversa" }, { status: 400 })
  }

  const { error: convError } = await supabaseAdmin
    .from("conversas")
    .update({
      modoConversa: "humano",
      // `conversas.etapa` NAO acompanha a pausa, de proposito. Ela e o ponto de
      // retorno: `retomar-ia` le esse campo via `etapaRetornoIASegura`, e
      // "atendimento_humano" nao esta em ETAPAS_RETORNO_IA — entao gravar aqui
      // fazia o valor real ("agendamento", "consulta_agendada") ser perdido e a
      // conversa voltar do humano em "qualificacao", com a Ana pedindo regiao e
      // foto de quem ja tinha reuniao marcada. O contato tambem era rebobinado,
      // porque `retomar-ia` grava o mesmo valor em `statusFunil`.
      //
      // Quem pausa o agente e `contatos.statusFunil = atendimento_humano` +
      // `responsavelId`, checados no inicio de `processarMensagens` — nao esta
      // coluna. Escrito na revisao de 29/07/2026, depois da OPE-561.
      atendenteId: auth.session.user.id,
      atualizadoEm: agora(),
    })
    .eq("id", conversa.id)

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from("contatos")
    .update({
      responsavelId: auth.session.user.id,
      statusFunil: "atendimento_humano" as never,
      ultimaMovimentacaoEm: agora(),
      atualizadoEm: agora(),
    })
    .eq("id", conversa.contatoId)

  return NextResponse.json({ sucesso: true, modoConversa: "humano" })
}
