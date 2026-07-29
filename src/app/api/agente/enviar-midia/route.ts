import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { enviarMidiaMarketing } from "@/lib/agente/enviar-midia-marketing"
import { MOTIVOS_TOOL } from "@/lib/agente/motivos-tool"

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
      motivoCodigo: MOTIVOS_TOOL.PARAMETROS_AUSENTES,
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
      motivoCodigo: MOTIVOS_TOOL.MIDIA_NAO_ENCONTRADA,
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
      motivoCodigo: MOTIVOS_TOOL.CONTATO_NAO_ENCONTRADO,
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
      motivoCodigo: MOTIVOS_TOOL.WHATSAPP_NAO_CONFIGURADO,
    })
  }

  if (!lead.whatsapp) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivoCodigo: MOTIVOS_TOOL.CONTATO_NAO_ENCONTRADO,
    })
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
