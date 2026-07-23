import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarId } from "@/lib/db-utils"
import { enviarMidia } from "@/lib/uazapi"
import { orcamentoVigente } from "@/lib/orcamento/vigencia"

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
      motivo: "contatoId e conversaId sao obrigatorios",
    })
  }

  const orcamento = await orcamentoVigente({ contatoId, conversaId })

  if (!orcamento?.pdfUrl) {
    // Sem orcamento vigente nao existe PDF para reenviar. A IA deve conduzir a
    // qualificacao em vez de prometer um arquivo que nao ha.
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo:
        "Nao ha orcamento vigente com PDF neste atendimento. Nao prometa o arquivo: conduza a qualificacao ou gere um orcamento novo.",
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
    return NextResponse.json({ ok: false, error: "Contato sem WhatsApp" }, { status: 400 })
  }

  if (!configWa?.uazapiUrl || !configWa?.instanceToken) {
    return NextResponse.json({ ok: false, error: "WhatsApp nao configurado" }, { status: 502 })
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
    return NextResponse.json(
      { ok: false, error: "Nao consegui enviar o PDF agora", detalhe },
      { status: 502 }
    )
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
