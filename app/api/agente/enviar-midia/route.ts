import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { enviarMidia } from "@/lib/uazapi"
import { criarId, agora } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  const body = await request.json()
  const { leadId, conversaId, midiaId, categoria, procedimento } = body as {
    leadId?: string
    conversaId?: string
    midiaId?: string
    categoria?: string
    procedimento?: string
  }

  if (!leadId || !conversaId) {
    return NextResponse.json(
      { error: "leadId e conversaId obrigatórios" },
      { status: 400 }
    )
  }

  // JLAU-570: prioridade 1 — IA escolheu midia especifica por ID.
  let midia: { id: string; titulo: string; url: string; tipo: string } | null = null

  if (midiaId) {
    const { data } = await supabaseAdmin
      .from("midia_marketing")
      .select("id, titulo, url, tipo")
      .eq("id", midiaId)
      .eq("ativo", true)
      .is("deletadoEm", null)
      .maybeSingle()
    midia = data
  }

  // Fallback: IA passou so categoria (ou midiaId nao existe) — sorteia aleatorio.
  if (!midia && categoria) {
    let query = supabaseAdmin
      .from("midia_marketing")
      .select("id, titulo, url, tipo")
      .eq("categoria", categoria)
      .eq("ativo", true)
      .is("deletadoEm", null)

    if (procedimento) query = query.eq("procedimento", procedimento)

    const { data: candidatas } = await query
    if (candidatas && candidatas.length > 0) {
      midia = candidatas[Math.floor(Math.random() * candidatas.length)]
    }
  }

  if (!midia) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      motivo: "Nenhuma mídia disponível",
    })
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("whatsapp")
    .eq("id", leadId)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
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

  const tipoUazapi = midia.tipo === "video" ? "video" : "image"

  try {
    await enviarMidia(
      configWa.uazapiUrl,
      configWa.instanceToken,
      lead.whatsapp,
      urlCompleta,
      tipoUazapi as "image" | "video",
      midia.titulo
    )
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
      leadId,
      messageIdWhatsapp: `agente_midia_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      tipo: midia.tipo === "video" ? "video" : "imagem",
      conteudo: midia.titulo,
      remetente: "agente",
      mediaUrl: urlCompleta,
      mediaType: midia.tipo,
    })

  await supabaseAdmin
    .from("conversas")
    .update({ ultimaMensagemEm: agora(), atualizadoEm: agora() })
    .eq("id", conversaId)

  return NextResponse.json({
    ok: true,
    enviado: true,
    midiaId: midia.id,
    titulo: midia.titulo,
    tipo: midia.tipo,
  })
}
