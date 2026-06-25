import { supabaseAdmin } from "@/lib/supabase"
import { enviarMensagem, enviarMidia } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"
import { getBaseUrl } from "@/lib/env"

interface NotificacaoArgs {
  orcamentoPendenteId: string
  contatoId: string
  resumoCaso: string
  prioridade: "normal" | "urgente"
}

interface FotoOrcamento {
  url: string
  descricao: string | null
}

function limparNome(nome?: string | null): string {
  return nome?.replace(/^WhatsApp\s+/, "").trim() || "Paciente"
}

function compactarTexto(texto: string): string {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .join("\n")
}

function montarResumo(params: {
  resumoCaso: string
  procedimento: string
  sobreOPaciente?: string | null
}): string {
  const partes = [
    params.procedimento !== "Nao informado"
      ? `Procedimento de interesse: ${params.procedimento}`
      : null,
    params.sobreOPaciente
      ? `Dados do paciente:\n${params.sobreOPaciente}`
      : null,
    params.resumoCaso ? `Resumo da qualificacao:\n${params.resumoCaso}` : null,
  ].filter(Boolean)

  return compactarTexto(partes.join("\n\n")).slice(0, 1800)
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
    .select("nome, whatsapp, procedimentoInteresse, sobreOPaciente")
    .eq("id", args.contatoId)
    .maybeSingle()

  const { data: fotos } = await supabaseAdmin
    .from("fotos_contato")
    .select("url, descricao")
    .eq("contatoId", args.contatoId)
    .order("criadoEm", { ascending: false })
    .limit(3)

  const fotosOrcamento = ((fotos ?? []) as FotoOrcamento[]).filter((foto) =>
    Boolean(foto.url)
  )
  const nome = limparNome(contato?.nome)
  const tel = contato?.whatsapp || "(sem WhatsApp registrado)"
  const procedimento = contato?.procedimentoInteresse || "Nao informado"
  const linkConversa = `${getBaseUrl()}/contatos/${args.contatoId}`
  const titulo = args.prioridade === "urgente" ? "ORCAMENTO URGENTE" : "Orcamento"
  const fotosTexto =
    fotosOrcamento.length > 0
      ? `${fotosOrcamento.length} foto(s) enviada(s) em seguida`
      : "Nenhuma foto recebida"
  const resumo = montarResumo({
    resumoCaso: args.resumoCaso,
    procedimento,
    sobreOPaciente: contato?.sobreOPaciente ?? null,
  })

  const mensagem = [
    `${titulo} - ${nome}`,
    ``,
    `Responda com: ${tel} - R$ <valor>`,
    ``,
    `Paciente: ${nome}`,
    `WhatsApp: ${tel}`,
    `Procedimento: ${procedimento}`,
    `Fotos: ${fotosTexto}`,
    ``,
    `Resumo do caso:`,
    resumo,
    ``,
    `Abrir conversa: ${linkConversa}`,
  ].join("\n")

  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken,
    numeroPessoal,
    mensagem
  )

  for (const [index, foto] of fotosOrcamento.entries()) {
    try {
      const legenda = [
        `Foto ${index + 1}/${fotosOrcamento.length} - ${nome}`,
        foto.descricao ? `Descricao: ${foto.descricao}` : null,
      ]
        .filter(Boolean)
        .join("\n")

      await enviarMidia(
        configWa.uazapiUrl,
        configWa.instanceToken,
        numeroPessoal,
        foto.url,
        "image",
        legenda || undefined
      )
    } catch (err) {
      console.error("[notificar-handoff] falha ao enviar foto ao Dr. Lucas:", {
        contatoId: args.contatoId,
        orcamentoPendenteId: args.orcamentoPendenteId,
        fotoUrl: foto.url,
        erro: err instanceof Error ? err.message : err,
      })
    }
  }

  await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .update({ notificacaoEnviadaEm: agora() })
    .eq("id", args.orcamentoPendenteId)
}
