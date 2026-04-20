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

/** Apaga fisicamente todas as dependencias de um contato (antigo limparDependenciasDoLead).
 *  Usado pelo DELETE /api/contatos/[id] e por rotinas LGPD.
 *  NAO toca no registro contatos — quem chama decide se faz soft-delete + hash. */
export async function limparDependenciasDoContato(params: {
  contatoId: string
  chatId: string | null
}): Promise<void> {
  const { contatoId, chatId } = params

  const { data: mensagens } = await supabaseAdmin
    .from("mensagens_whatsapp")
    .select("id, mediaUrl")
    .eq("contatoId", contatoId)

  const pathsMidiaWebhook = (mensagens ?? [])
    .map((m) =>
      m.mediaUrl ? extrairPathDoStorageUrl(m.mediaUrl, "atendimento-midias") : null
    )
    .filter((p): p is string => !!p)

  if (pathsMidiaWebhook.length > 0) {
    const { error } = await supabaseAdmin.storage
      .from("atendimento-midias")
      .remove(pathsMidiaWebhook)
    if (error) console.warn("[limparDependenciasDoContato] storage atendimento-midias:", error.message)
  }

  const { data: arquivosFotos } = await supabaseAdmin.storage
    .from("fotos-leads")
    .list(contatoId)

  if (arquivosFotos && arquivosFotos.length > 0) {
    const paths = arquivosFotos.map((a) => `${contatoId}/${a.name}`)
    const { error } = await supabaseAdmin.storage.from("fotos-leads").remove(paths)
    if (error) console.warn("[limparDependenciasDoContato] storage fotos-leads:", error.message)
  }

  await supabaseAdmin.from("analista_logs").delete().eq("contatoId", contatoId)
  await supabaseAdmin.from("mensagens_whatsapp").delete().eq("contatoId", contatoId)
  await supabaseAdmin.from("fotos_contato").delete().eq("contatoId", contatoId)
  await supabaseAdmin.from("conversas").delete().eq("contatoId", contatoId)
  await supabaseAdmin.from("agendamentos").delete().eq("contatoId", contatoId)

  if (chatId) {
    await Promise.allSettled([
      limparMemoria(chatId),
      limparBuffer(chatId),
      limparDebounce(chatId),
    ])
  }
}

/** Hash SHA-256 do whatsapp com sufixo opcional do contatoId.
 *  Garante unicidade entre soft-deletes (a coluna whatsapp tem UNIQUE).
 *  Idempotente: se o valor ja parece anonimizado, retorna inalterado. */
export function anonimizarWhatsapp(whatsapp: string, contatoId?: string): string {
  if (WHATSAPP_ANONIMIZADO_REGEX.test(whatsapp)) return whatsapp
  const hash = createHash("sha256").update(whatsapp).digest("hex")
  return contatoId ? `${hash}_${contatoId.slice(0, 8)}` : hash
}
