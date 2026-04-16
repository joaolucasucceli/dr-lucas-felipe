import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { captarLeadSiteSchema } from "@/lib/validations/lead-site"
import { criarId, agora } from "@/lib/db-utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body._hp) {
      return NextResponse.json({ sucesso: true }, { status: 201 })
    }

    const resultado = captarLeadSiteSchema.safeParse(body)
    if (!resultado.success) {
      const detalhes = resultado.error.flatten().fieldErrors
      return NextResponse.json(
        { error: "Dados inválidos", detalhes },
        { status: 400 }
      )
    }

    const { nome, whatsapp, procedimentoInteresse } = resultado.data

    const { data: usuarioIa } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("tipo", "ia")
      .eq("ativo", true)
      .is("deletadoEm", null)
      .maybeSingle()

    if (!usuarioIa) {
      console.warn("[captar-lead] Nenhum usuário IA ativo encontrado — lead será criado sem responsável")
    }

    const { data: leadExistente } = await supabaseAdmin
      .from("leads")
      .select("id, responsavelId")
      .eq("whatsapp", whatsapp)
      .maybeSingle()

    const consentimentoEm = agora()

    if (leadExistente) {
      const dadosUpdate: Record<string, unknown> = {
        nome,
        procedimentoInteresse,
        origem: "site",
        consentimentoLgpd: true,
        consentimentoLgpdEm: consentimentoEm,
        deletadoEm: null,
        arquivado: false,
        arquivadoEm: null,
        atualizadoEm: consentimentoEm,
      }

      if (!leadExistente.responsavelId && usuarioIa) {
        dadosUpdate.responsavelId = usuarioIa.id
      }

      await supabaseAdmin
        .from("leads")
        .update(dadosUpdate)
        .eq("id", leadExistente.id)
    } else {
      await supabaseAdmin
        .from("leads")
        .insert({
          id: criarId(),
          atualizadoEm: consentimentoEm,
          nome,
          whatsapp,
          procedimentoInteresse,
          origem: "site",
          statusFunil: "acolhimento",
          consentimentoLgpd: true,
          consentimentoLgpdEm: consentimentoEm,
          responsavelId: usuarioIa?.id || null,
        })
    }

    return NextResponse.json({ sucesso: true }, { status: 201 })
  } catch (error) {
    console.error("[captar-lead] Erro:", error)
    return NextResponse.json(
      { error: "Erro interno. Tente novamente mais tarde." },
      { status: 500 }
    )
  }
}
