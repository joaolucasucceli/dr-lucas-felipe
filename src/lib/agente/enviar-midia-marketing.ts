import { criarId, agora } from "@/lib/db-utils"
import { supabaseAdmin } from "@/lib/supabase"
import { enviarMidia } from "@/lib/uazapi"
import { midiaMarketingExisteNoStorage } from "@/lib/agente/midia-marketing-storage"

export interface MidiaMarketingEnvio {
  id: string
  descricao: string
  url: string
}

export interface ConfigWhatsappEnvio {
  uazapiUrl?: string | null
  instanceToken?: string | null
}

function inferirTipoArquivo(url: string): "video" | "imagem" {
  return /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(url) ? "video" : "imagem"
}

function urlPublicaMidia(url: string, baseUrl?: string | null): string {
  if (url.startsWith("http")) return url

  const origem = (baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")
  return `${origem}${url.startsWith("/") ? "" : "/"}${url}`
}

export async function resolverConversaAtiva(
  contatoId: string,
  conversaId?: string | null
): Promise<string | null> {
  if (conversaId) return conversaId

  const { data } = await supabaseAdmin
    .from("conversas")
    .select("id")
    .eq("contatoId", contatoId)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}

export async function enviarMidiaMarketing(params: {
  contatoId: string
  conversaId?: string | null
  whatsapp: string
  configWa: ConfigWhatsappEnvio | null
  midia: MidiaMarketingEnvio
  baseUrl?: string | null
  contextoLog?: string
}): Promise<{
  ok: boolean
  enviado: boolean
  motivo?: string
  midiaId?: string
  mediaUrl?: string
  tipo?: "imagem" | "video"
}> {
  const { contatoId, whatsapp, configWa, midia, baseUrl, contextoLog } = params

  if (!configWa?.uazapiUrl || !configWa?.instanceToken) {
    return { ok: true, enviado: false, motivo: "WhatsApp nao configurado" }
  }

  const conversaId = await resolverConversaAtiva(contatoId, params.conversaId)
  if (!conversaId) {
    return { ok: true, enviado: false, motivo: "Conversa nao encontrada" }
  }

  const arquivoExiste = await midiaMarketingExisteNoStorage(midia.url)
  if (!arquivoExiste) {
    console.warn("[enviar-midia-marketing] Midia sem arquivo no Storage:", {
      midiaId: midia.id,
      contexto: contextoLog,
    })
    return { ok: true, enviado: false, motivo: "Midia indisponivel no Storage" }
  }

  const mediaUrl = urlPublicaMidia(midia.url, baseUrl)
  const tipo = inferirTipoArquivo(mediaUrl)
  const tipoUazapi = tipo === "video" ? "video" : "image"

  try {
    await enviarMidia(
      configWa.uazapiUrl,
      configWa.instanceToken,
      whatsapp,
      mediaUrl,
      tipoUazapi
    )
  } catch (err) {
    console.error("[enviar-midia-marketing] Falha ao enviar via Uazapi:", {
      midiaId: midia.id,
      mediaUrl,
      tipo: tipoUazapi,
      contexto: contextoLog,
      erro: err instanceof Error ? err.message : err,
    })
    return {
      ok: true,
      enviado: false,
      motivo: "Falha ao enviar midia",
      midiaId: midia.id,
    }
  }

  const { error } = await supabaseAdmin.from("mensagens_whatsapp").insert({
    id: criarId(),
    conversaId,
    contatoId,
    messageIdWhatsapp: `agente_midia_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    tipo: tipo as never,
    conteudo: midia.descricao.slice(0, 200),
    remetente: "agente" as never,
    mediaUrl,
    mediaType: tipo,
  })

  if (error) {
    console.error("[enviar-midia-marketing] Midia enviada, mas historico falhou:", {
      midiaId: midia.id,
      conversaId,
      contatoId,
      erro: error.message,
    })
  }

  await supabaseAdmin
    .from("conversas")
    .update({ ultimaMensagemEm: agora(), atualizadoEm: agora() })
    .eq("id", conversaId)

  return {
    ok: true,
    enviado: true,
    midiaId: midia.id,
    mediaUrl,
    tipo,
  }
}
