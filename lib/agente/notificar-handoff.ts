import { supabaseAdmin } from "@/lib/supabase"
import { enviarMensagem } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"
import { getBaseUrl } from "@/lib/env"

interface NotificacaoArgs {
  orcamentoPendenteId: string
  contatoId: string
  resumoCaso: string
  prioridade: "normal" | "urgente"
}

/**
 * Manda mensagem WhatsApp privada pro numero pessoal do Dr. Lucas avisando
 * que tem um orcamento esperando. Usa a propria instancia Uazapi ja
 * configurada da clinica (mesma config_whatsapp ativa).
 *
 * Numero pessoal vem de env `DR_LUCAS_WHATSAPP_PESSOAL` (formato: 5527..., so
 * digitos). Se nao configurado, loga warn e nao envia — UI /painel/
 * orcamentos-pendentes ainda mostra o pendente.
 */
export async function notificarDrLucasOrcamento(
  args: NotificacaoArgs
): Promise<void> {
  const numeroPessoal = (process.env.DR_LUCAS_WHATSAPP_PESSOAL ?? "").trim()
  if (!numeroPessoal) {
    console.warn(
      "[notificar-handoff] DR_LUCAS_WHATSAPP_PESSOAL nao configurada — pendente fica so na UI"
    )
    return
  }

  const { data: configWa } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .order("atualizadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!configWa?.uazapiUrl || !configWa?.instanceToken) {
    console.error("[notificar-handoff] config_whatsapp ausente — nao posso notificar")
    return
  }

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("nome, whatsapp")
    .eq("id", args.contatoId)
    .maybeSingle()

  const nome = contato?.nome?.replace(/^WhatsApp\s+/, "") || "Paciente"
  const tel = contato?.whatsapp || "(sem WhatsApp registrado)"

  const baseUrl = getBaseUrl()
  const linkConversa = `${baseUrl}/contatos/${args.contatoId}`

  const prefixoPrioridade =
    args.prioridade === "urgente" ? "🚨 ORÇAMENTO URGENTE" : "📋 Orçamento"

  const mensagem = [
    `${prefixoPrioridade} — ${nome}`,
    `${tel}`,
    ``,
    `${args.resumoCaso}`,
    ``,
    `Abrir conversa: ${linkConversa}`,
  ].join("\n")

  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken,
    numeroPessoal,
    mensagem
  )

  // Marca timestamp da notificacao no evento (auditoria)
  await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .update({ notificacaoEnviadaEm: agora() })
    .eq("id", args.orcamentoPendenteId)
}
