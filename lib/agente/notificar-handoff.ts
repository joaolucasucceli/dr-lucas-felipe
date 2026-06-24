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

export async function notificarDrLucasOrcamento(
  args: NotificacaoArgs
): Promise<void> {
  const numeroPessoal = (process.env.DR_LUCAS_WHATSAPP_PESSOAL ?? "").trim()
  if (!numeroPessoal) {
    console.warn(
      "[notificar-handoff] DR_LUCAS_WHATSAPP_PESSOAL nao configurada - pendente fica so na UI"
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
    console.error("[notificar-handoff] config_whatsapp ausente - nao posso notificar")
    return
  }

  const { data: contato } = await supabaseAdmin
    .from("contatos")
    .select("nome, whatsapp, procedimentoInteresse")
    .eq("id", args.contatoId)
    .maybeSingle()

  const nome = contato?.nome?.replace(/^WhatsApp\s+/, "") || "Paciente"
  const tel = contato?.whatsapp || "(sem WhatsApp registrado)"
  const procedimento = contato?.procedimentoInteresse || "Nao informado"
  const linkConversa = `${getBaseUrl()}/contatos/${args.contatoId}`
  const titulo = args.prioridade === "urgente" ? "ORCAMENTO URGENTE" : "Orcamento"

  const mensagem = [
    `${titulo} - ${nome}`,
    ``,
    `Responda com: ${tel} - R$ <valor>`,
    ``,
    `WhatsApp: ${tel}`,
    `Procedimento: ${procedimento}`,
    ``,
    `Resumo do caso:`,
    args.resumoCaso,
    ``,
    `Abrir conversa: ${linkConversa}`,
  ].join("\n")

  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken,
    numeroPessoal,
    mensagem
  )

  await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .update({ notificacaoEnviadaEm: agora() })
    .eq("id", args.orcamentoPendenteId)
}
