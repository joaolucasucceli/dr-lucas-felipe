import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { captarContatoSiteSchema } from "@/lib/validations/contato-site"
import { criarId, agora } from "@/lib/db-utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body._hp) {
      return NextResponse.json({ sucesso: true }, { status: 201 })
    }

    const resultado = captarContatoSiteSchema.safeParse(body)
    if (!resultado.success) {
      const detalhes = resultado.error.flatten().fieldErrors
      return NextResponse.json(
        { error: "Dados inválidos", detalhes },
        { status: 400 }
      )
    }

    const { nome, whatsapp, procedimentoInteresse } = resultado.data

    const { data: contatoExistente } = await supabaseAdmin
      .from("contatos")
      .select("id, responsavelId")
      .eq("whatsapp", whatsapp)
      .is("deletadoEm", null)
      .maybeSingle()

    const consentimentoEm = agora()

    if (contatoExistente) {
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

      await supabaseAdmin
        .from("contatos")
        .update(dadosUpdate)
        .eq("id", contatoExistente.id)
    } else {
      await supabaseAdmin
        .from("contatos")
        .insert({
          id: criarId(),
          atualizadoEm: consentimentoEm,
          tipo: "lead",
          nome,
          whatsapp,
          procedimentoInteresse,
          origem: "site",
          statusFunil: "acolhimento",
          consentimentoLgpd: true,
          consentimentoLgpdEm: consentimentoEm,
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
