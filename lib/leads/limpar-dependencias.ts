import { createHash } from "crypto"
import { supabaseAdmin } from "@/lib/supabase"
import { limparMemoria } from "@/lib/agente/memoria"
import { limparBuffer, limparDebounce } from "@/lib/agente/buffer"

const WHATSAPP_ANONIMIZADO_REGEX = /^[a-f0-9]{64}(_[a-z0-9]+)?$/

function extrairPathDoStorageUrl(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length)
}

/** JLAU-552: apaga fisicamente todas as dependencias de um lead.
 *  Usado pelo DELETE /api/leads/[id] (e reusavel por rotinas LGPD).
 *  NAO toca no registro `leads` — quem chama decide se faz soft-delete + hash. */
export async function limparDependenciasDoLead(params: {
  leadId: string
  chatId: string | null
}): Promise<void> {
  const { leadId, chatId } = params

  const { data: mensagens } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .select("id, mediaUrl")
    .eq("leadId", leadId)

  const pathsMidiaWebhook = (mensagens ?? [])
    .map((m) =>
      m.mediaUrl ? extrairPathDoStorageUrl(m.mediaUrl, "atendimento-midias") : null
    )
    .filter((p): p is string => !!p)

  if (pathsMidiaWebhook.length > 0) {
    const { error } = await supabaseAdmin.storage
      .from("atendimento-midias")
      .remove(pathsMidiaWebhook)
    if (error) console.warn("[limparDependenciasDoLead] storage atendimento-midias:", error.message)
  }

  const { data: arquivosFotos } = await supabaseAdmin.storage
    .from("fotos-leads")
    .list(leadId)

  if (arquivosFotos && arquivosFotos.length > 0) {
    const paths = arquivosFotos.map((a) => `${leadId}/${a.name}`)
    const { error } = await supabaseAdmin.storage.from("fotos-leads").remove(paths)
    if (error) console.warn("[limparDependenciasDoLead] storage fotos-leads:", error.message)
  }

  await supabaseAdmin.from("analista_logs").delete().eq("leadId", leadId)
  await supabaseAdmin.from("mensagens_whatsapp").delete().eq("leadId", leadId)
  await supabaseAdmin.from("fotos_lead").delete().eq("leadId", leadId)
  await supabaseAdmin.from("conversas").delete().eq("leadId", leadId)
  await supabaseAdmin.from("agendamentos").delete().eq("leadId", leadId)

  if (chatId) {
    await Promise.allSettled([
      limparMemoria(chatId),
      limparBuffer(chatId),
      limparDebounce(chatId),
    ])
  }
}

/** Retorna hash SHA-256 do whatsapp com sufixo opcional do leadId para
 *  garantir unicidade entre soft-deletes (a coluna `whatsapp` tem UNIQUE key,
 *  entao dois leads historicamente com mesmo numero colidiriam no hash puro).
 *  Idempotente: se o valor ja parece anonimizado, retorna inalterado. */
export function anonimizarWhatsapp(whatsapp: string, leadId?: string): string {
  if (WHATSAPP_ANONIMIZADO_REGEX.test(whatsapp)) return whatsapp
  const hash = createHash("sha256").update(whatsapp).digest("hex")
  return leadId ? `${hash}_${leadId.slice(0, 8)}` : hash
}
