import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { enviarMidia } from "@/lib/uazapi"
import { criarId, agora } from "@/lib/db-utils"
import { midiaMarketingExisteNoStorage } from "@/lib/agente/midia-marketing-storage"

function inferirTipoArquivo(url: string): "video" | "imagem" {
  return /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(url) ? "video" : "imagem"
}

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

  const arquivoExiste = await midiaMarketingExisteNoStorage(midia.url)
  if (!arquivoExiste) {
    console.warn("[enviar-midia] Midia cadastrada sem arquivo no Storage:", {
      midiaId: midia.id,
      url: midia.url,
    })
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "Midia indisponivel no Storage",
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

  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")
  const urlCompleta = midia.url.startsWith("http")
    ? midia.url
    : `${baseUrl}${midia.url.startsWith("/") ? "" : "/"}${midia.url}`

  const tipo = inferirTipoArquivo(urlCompleta)
  const tipoUazapi = tipo === "video" ? "video" : "image"

  console.log("[enviar-midia] Disparando Uazapi:", {
    midiaId: midia.id,
    whatsapp: lead.whatsapp,
    url: urlCompleta,
    tipo: tipoUazapi,
  })

  // Midia e enviada SEM legenda. A descricao existe apenas para a IA escolher
  // qual enviar — reproduzir ela como caption no WhatsApp gera duplicacao com
  // o texto natural de contextualizacao que a IA escreve em seguida.
  if (!lead.whatsapp) {
    return NextResponse.json({ error: "Contato sem WhatsApp" }, { status: 400 })
  }

  try {
    await enviarMidia(
      configWa.uazapiUrl,
      configWa.instanceToken,
      lead.whatsapp,
      urlCompleta,
      tipoUazapi as "image" | "video"
    )
    console.log("[enviar-midia] Uazapi aceitou:", { midiaId: midia.id })
  } catch (err) {
    console.error("[enviar-midia] Falha ao enviar via Uazapi:", {
      midiaId: midia.id,
      url: urlCompleta,
      tipo: tipoUazapi,
      erro: err instanceof Error ? err.message : err,
    })
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "Falha ao enviar mídia (Uazapi rejeitou ou URL inacessível)",
    })
  }

  await supabaseAdmin
    .from("mensagens_whatsapp")
    .insert({
      id: criarId(),
      conversaId,
      contatoId,
      messageIdWhatsapp: `agente_midia_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      tipo,
      conteudo: midia.descricao.slice(0, 200),
      remetente: "agente",
      mediaUrl: urlCompleta,
      mediaType: tipo,
    })

  await supabaseAdmin
    .from("conversas")
    .update({ ultimaMensagemEm: agora(), atualizadoEm: agora() })
    .eq("id", conversaId)

  return NextResponse.json({
    ok: true,
    enviado: true,
    midiaId: midia.id,
    tipo,
  })
}
