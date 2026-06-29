import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { enviarMidiaMarketing } from "@/lib/agente/enviar-midia-marketing"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  const body = await request.json()
  const { contatoId, conversaId, midiaId } = body as {
    contatoId?: string
    conversaId?: string
    midiaId?: string
  }

  if (!contatoId || !conversaId || !midiaId) {
    console.warn("[enviar-midia] Parametros obrigatorios ausentes:", { contatoId, conversaId, midiaId })
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "Parametros ausentes — chame listar_midias para obter midiaId valido antes de enviar_midia",
    })
  }

  const { data: midia } = await supabaseAdmin
    .from("midia_marketing")
    .select("id, descricao, url")
    .eq("id", midiaId)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!midia || !midia.descricao) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "Mídia não encontrada ou inativa",
    })
  }

  const { data: lead } = await supabaseAdmin
    .from("contatos")
    .select("whatsapp")
    .eq("id", contatoId)
    .maybeSingle()

  if (!lead) {
    console.warn("[enviar-midia] Lead nao encontrado:", { contatoId })
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "Lead nao encontrado",
    })
  }

  const { data: configWa } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .maybeSingle()

  if (!configWa?.uazapiUrl || !configWa?.instanceToken) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "WhatsApp não configurado",
    })
  }

  if (!lead.whatsapp) {
    return NextResponse.json({ error: "Contato sem WhatsApp" }, { status: 400 })
  }

  const resultado = await enviarMidiaMarketing({
    contatoId,
    conversaId,
    whatsapp: lead.whatsapp,
    configWa,
    midia,
    contextoLog: "tool_enviar_midia",
  })

  return NextResponse.json(resultado)
}
