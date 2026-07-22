import { supabaseAdmin } from "@/lib/supabase"
import { enviarMensagem, enviarMidia } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"
import { getBaseUrl } from "@/lib/env"
import { montarReferenciaValorPorRegiao } from "@/lib/procedimentos/faixa-regiao"
import { resolverProcedimentoPorInteresse } from "@/lib/procedimentos/resolver-procedimento"

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

export type ResultadoNotificacaoOrcamento =
  | {
      ok: true
      fotosEnviadas: number
      fotosFalhas: number
      notificacaoEnviadaEm: string
    }
  | { ok: false; error: string }

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
): Promise<ResultadoNotificacaoOrcamento> {
  const numeroPessoal = (process.env.DR_LUCAS_WHATSAPP_PESSOAL ?? "").trim()
  if (!numeroPessoal) {
    const error = "DR_LUCAS_WHATSAPP_PESSOAL nao configurada"
    console.warn(`[notificar-handoff] ${error}`)
    return { ok: false, error }
  }

  const { data: configWa } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .order("atualizadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!configWa?.uazapiUrl || !configWa?.instanceToken) {
    const error = "config_whatsapp ativa ausente"
    console.error(`[notificar-handoff] ${error} - nao posso notificar`)
    return { ok: false, error }
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
  const titulo =
    args.prioridade === "urgente" ? "ORCAMENTO URGENTE" : "Orcamento"
  const fotosTexto =
    fotosOrcamento.length > 0
      ? `${fotosOrcamento.length} foto(s) enviada(s) em seguida`
      : "Nenhuma foto recebida"
  const resumo = montarResumo({
    resumoCaso: args.resumoCaso,
    procedimento,
    sobreOPaciente: contato?.sobreOPaciente ?? null,
  })

  // Referencia de valor por regiao — so pro Dr. Lucas, nunca pro paciente.
  // Cadastrada em /procedimentos > Valores por regiao. Se nada casar, a secao
  // simplesmente nao aparece (melhor sem numero do que com numero errado).
  let referenciaValor: string | null = null
  try {
    const procedimentoResolvido = await resolverProcedimentoPorInteresse({
      procedimentoInteresse: contato?.procedimentoInteresse ?? null,
    })
    referenciaValor = await montarReferenciaValorPorRegiao({
      procedimentoId: procedimentoResolvido?.id ?? null,
      textoParaExtrairRegioes: [
        contato?.procedimentoInteresse ?? "",
        contato?.sobreOPaciente ?? "",
        args.resumoCaso,
      ].join(" "),
    })
  } catch (err) {
    // Referencia e um conforto, nao um requisito: nunca pode impedir o
    // Dr. Lucas de receber o caso.
    console.warn("[notificar-handoff] falha ao montar referencia de valor:", err)
  }

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
    ...(referenciaValor
      ? [``, `Sua faixa cadastrada pra regiao:`, referenciaValor]
      : []),
    ``,
    `Abrir conversa: ${linkConversa}`,
  ].join("\n")

  try {
    await enviarMensagem(
      configWa.uazapiUrl,
      configWa.instanceToken,
      numeroPessoal,
      mensagem
    )
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Falha ao enviar mensagem principal"
    console.error("[notificar-handoff] falha ao enviar mensagem principal:", {
      contatoId: args.contatoId,
      orcamentoPendenteId: args.orcamentoPendenteId,
      erro: error,
    })
    return { ok: false, error }
  }

  let fotosEnviadas = 0
  let fotosFalhas = 0
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
      fotosEnviadas++
    } catch (err) {
      fotosFalhas++
      console.error("[notificar-handoff] falha ao enviar foto ao Dr. Lucas:", {
        contatoId: args.contatoId,
        orcamentoPendenteId: args.orcamentoPendenteId,
        fotoUrl: foto.url,
        erro: err instanceof Error ? err.message : err,
      })
    }
  }

  const notificacaoEnviadaEm = agora()
  const { error: errUpdate } = await supabaseAdmin
    .from("eventos_orcamento_pendente")
    .update({ notificacaoEnviadaEm })
    .eq("id", args.orcamentoPendenteId)

  if (errUpdate) {
    console.error(
      "[notificar-handoff] mensagem enviada mas falhou ao registrar auditoria:",
      {
        contatoId: args.contatoId,
        orcamentoPendenteId: args.orcamentoPendenteId,
        erro: errUpdate.message,
      }
    )
    return { ok: false, error: errUpdate.message }
  }

  return { ok: true, fotosEnviadas, fotosFalhas, notificacaoEnviadaEm }
}
