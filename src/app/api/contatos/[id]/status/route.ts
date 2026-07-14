import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth } from "@/lib/auth-helpers"
import { mudarStatusSchema } from "@/lib/validations/contato"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = mudarStatusSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("id, tipo, statusFunil, responsavelId")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!contato) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
  }

  if (contato.tipo !== "lead") {
    return NextResponse.json(
      { error: "Apenas contatos tipo lead têm status de funil" },
      { status: 400 }
    )
  }

  const perfil = auth.session.user.perfil
  if (perfil === "atendente" && contato.responsavelId !== auth.session.user.id) {
    return NextResponse.json(
      { error: "Sem permissão para mover este contato" },
      { status: 403 }
    )
  }

  const novoStatus = parsed.data.statusFunil
  const tsAgora = agora()

  const { data: conversaAberta } = await supabaseAdmin
    .from("conversas")
    .select("id, etapa")
    .eq("contatoId", id)
    .is("encerradaEm", null)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  const updateContato: Record<string, unknown> = {
    statusFunil: novoStatus,
    ultimaMovimentacaoEm: tsAgora,
    atualizadoEm: tsAgora,
  }

  let updateConversa: Record<string, unknown> | null = null

  if (novoStatus === "atendimento_humano") {
    updateContato.responsavelId = "usr-lucas"
    updateConversa = {
      modoConversa: "humano",
      atendenteId: "usr-lucas",
      atualizadoEm: tsAgora,
    }
  } else if (novoStatus === "consulta_agendada") {
    updateContato.responsavelId = "usr-lucas"
    updateConversa = {
      etapa: novoStatus,
      atualizadoEm: tsAgora,
    }
  } else if (contato.statusFunil === "atendimento_humano") {
    updateConversa = {
      modoConversa: "ia",
      atendenteId: null,
      etapa: novoStatus,
      atualizadoEm: tsAgora,
    }
    updateContato.responsavelId = null
  } else {
    updateConversa = {
      etapa: novoStatus,
      atualizadoEm: tsAgora,
    }
  }

  const { data: atualizado, error } = await supabaseAdmin
    .from("contatos")
    .update(updateContato as never)
    .eq("id", id)
    .select("id, nome, statusFunil")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (conversaAberta && updateConversa) {
    await supabaseAdmin
      .from("conversas")
      .update(updateConversa as never)
      .eq("id", conversaAberta.id)
  }

  return NextResponse.json(atualizado)
}
