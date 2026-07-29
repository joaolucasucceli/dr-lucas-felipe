import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarId } from "@/lib/db-utils"
import { enviarMidia } from "@/lib/uazapi"
import { orcamentoVigente } from "@/lib/orcamento/vigencia"
import { MOTIVOS_TOOL } from "@/lib/agente/motivos-tool"

/**
 * Tool `reenviar_orcamento_pdf`.
 *
 * O unico caminho pelo qual a Ana Julia entrega o PDF do orcamento fora do envio
 * automatico que acontece quando o Dr. Lucas responde o valor.
 *
 * Existe porque ela nao tinha nenhum: o system prompt entregava a URL na mao do
 * modelo e a unica saida dele era colar o link em markdown, que o WhatsApp nao
 * renderiza — o paciente via um endereco cru de cinco linhas (print do Dr. Lucas,
 * OPE-428). Agora a URL nao chega ao modelo e o arquivo sai como documento, pelo
 * mesmo `enviarMidia(..., "document", ...)` que o webhook ja usava.
 */
export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { contatoId?: string; conversaId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { contatoId, conversaId } = body

  if (!contatoId || !conversaId) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivoCodigo: MOTIVOS_TOOL.PARAMETROS_AUSENTES,
    })
  }

  const orcamento = await orcamentoVigente({ contatoId, conversaId })

  if (!orcamento?.pdfUrl) {
    // Sem orcamento vigente nao existe PDF para reenviar. O loop trata esse
    // codigo de forma deterministica (OPE-554) — nada de prosa aqui, que era
    // exatamente o que a Ana parafraseava para a paciente.
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivoCodigo: MOTIVOS_TOOL.SEM_ORCAMENTO_VIGENTE,
    })
  }

  const [{ data: contato }, { data: configWa }] = await Promise.all([
    supabaseAdmin.from("contatos").select("whatsapp").eq("id", contatoId).maybeSingle(),
    supabaseAdmin
      .from("config_whatsapp")
      .select("uazapiUrl, instanceToken")
      .eq("ativo", true)
      .maybeSingle(),
  ])

  if (!contato?.whatsapp) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivoCodigo: MOTIVOS_TOOL.CONTATO_NAO_ENCONTRADO,
    })
  }

  if (!configWa?.uazapiUrl || !configWa?.instanceToken) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivoCodigo: MOTIVOS_TOOL.WHATSAPP_NAO_CONFIGURADO,
    })
  }

  const nomeArquivo = orcamento.nomeArquivo ?? "orcamento.pdf"

  try {
    await enviarMidia(
      configWa.uazapiUrl,
      configWa.instanceToken,
      contato.whatsapp,
      orcamento.pdfUrl,
      "document",
      undefined,
      undefined,
      nomeArquivo
    )
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err)
    console.error("[reenviar-orcamento-pdf] falha ao enviar documento:", detalhe)
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivoCodigo: MOTIVOS_TOOL.FALHA_ENVIO,
    })
  }

  // Historico, para o documento aparecer no atendimento (best-effort).
  const { error: erroHistorico } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .insert({
      id: criarId(),
      conversaId,
      contatoId,
      messageIdWhatsapp: `orcamento-reenvio-${criarId()}`,
      tipo: "documento",
      conteudo: nomeArquivo,
      mediaUrl: orcamento.pdfUrl,
      mediaType: "application/pdf",
      remetente: "agente",
    })

  if (erroHistorico) {
    console.error(
      "[reenviar-orcamento-pdf] PDF enviado mas nao registrado no historico:",
      erroHistorico.message
    )
  }

  return NextResponse.json({ ok: true, enviado: true, nomeArquivo })
}
