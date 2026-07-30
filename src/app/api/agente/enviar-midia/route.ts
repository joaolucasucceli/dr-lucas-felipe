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

  // ⛔ Resultado só aparece a partir da espera do orçamento (regra do Dr. Lucas,
  // 30/07/2026: *"essa imagem tem que ficar só no fluxo dos resultados até sair
  // o orçamento"*).
  //
  // No teste dele, dizer "quero saber sobre lipo de abdômen" já trazia foto de
  // resultado — porque o prompt mandava enviar uma mídia no início da
  // qualificação, regra que ELE tinha pedido em 25/05. Como a regra mudou, a
  // trava fica no CÓDIGO: prompt é instrução, não garantia (lição da OPE-558),
  // e o modelo volta a enviar assim que o contexto ficar longo.
  //
  // Só esta rota é travada, de propósito. O bloco de resultados da espera usa
  // `enviarMidiaMarketing` direto (`enviar-resultados-procedimento.ts`) e
  // continua funcionando — é justamente o "fluxo dos resultados" que ele quer.
  const { data: conversaAtual } = await supabaseAdmin
    .from("conversas")
    .select("etapa")
    .eq("id", conversaId)
    .maybeSingle()

  const etapaAtual = (conversaAtual?.etapa as string | null) ?? "acolhimento"
  if (["acolhimento", "qualificacao"].includes(etapaAtual)) {
    console.log("[enviar-midia] Bloqueado antes do orcamento", {
      contatoId,
      conversaId,
      etapa: etapaAtual,
    })
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivoCodigo: MOTIVOS_TOOL.MIDIA_FORA_DA_ETAPA,
    })
  }

  // A trava do tipo tambem vale aqui: o modelo pode mandar um midiaId que ele
  // viu em outra rodada, ou alucinar um id. So comparativo sai (OPE-553).
  const { data: midia } = await supabaseAdmin
    .from("midia_marketing")
    .select("id, descricao, url")
    .eq("id", midiaId)
    .eq("tipo", "comparativo")
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
