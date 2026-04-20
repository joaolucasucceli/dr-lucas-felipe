import { supabaseAdmin } from "@/lib/supabase"
import { openai } from "@/lib/openai"
import { enviarMensagem } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"

interface LeadAgente {
  id: string
  nome: string
  whatsapp: string
  procedimentoInteresse: string | null
}

interface ConversaComLead {
  id: string
  contatoId: string
  ultimaMensagemEm: string | null
  followUpEnviados: string[]
  lead: LeadAgente
}

interface ConfigWhatsappAtivo {
  uazapiUrl: string
  instanceToken: string | null
}

interface FollowUpPendente {
  conversa: ConversaComLead
  tipo: "1h" | "6h" | "24h"
}

export async function buscarConversasParaFollowUp(): Promise<FollowUpPendente[]> {
  const agoraTs = new Date()
  const ha1h = new Date(agoraTs.getTime() - 1 * 60 * 60 * 1000).toISOString()

  const { data: conversas, error } = await supabaseAdmin
    .from("conversas")
    .select(`
      id,
      contatoId,
      ultimaMensagemEm,
      followUpEnviados,
      etapa,
      lead:leads!conversas_contatoId_fkey(id, nome, whatsapp, procedimentoInteresse, arquivado, deletadoEm)
    `)
    .is("encerradaEm", null)
    .not("ultimaMensagemEm", "is", null)
    .lt("ultimaMensagemEm", ha1h)
    .in("etapa", ["acolhimento", "qualificacao", "agendamento"] as never)

  if (error || !conversas) return []

  type LeadRaw = LeadAgente & { arquivado: boolean; deletadoEm: string | null }
  type ConversaRaw = {
    id: string
    contatoId: string
    ultimaMensagemEm: string | null
    followUpEnviados: string[] | null
    lead: LeadRaw | LeadRaw[] | null
  }

  const pendentes: FollowUpPendente[] = []
  const ha6h = new Date(agoraTs.getTime() - 6 * 60 * 60 * 1000)
  const ha24h = new Date(agoraTs.getTime() - 24 * 60 * 60 * 1000)
  const ha1hDate = new Date(ha1h)

  for (const conversaRaw of conversas as unknown as ConversaRaw[]) {
    const leadRaw = Array.isArray(conversaRaw.lead) ? conversaRaw.lead[0] : conversaRaw.lead
    if (!leadRaw || leadRaw.arquivado || leadRaw.deletadoEm) continue
    if (!conversaRaw.ultimaMensagemEm) continue

    const ultimaMsg = new Date(conversaRaw.ultimaMensagemEm)
    const followUps = conversaRaw.followUpEnviados ?? []

    const conversa: ConversaComLead = {
      id: conversaRaw.id,
      contatoId: conversaRaw.contatoId,
      ultimaMensagemEm: conversaRaw.ultimaMensagemEm,
      followUpEnviados: followUps,
      lead: {
        id: leadRaw.id,
        nome: leadRaw.nome,
        whatsapp: leadRaw.whatsapp,
        procedimentoInteresse: leadRaw.procedimentoInteresse,
      },
    }

    if (ultimaMsg < ha24h && !followUps.includes("24h")) {
      pendentes.push({ conversa, tipo: "24h" })
    } else if (ultimaMsg < ha6h && !followUps.includes("6h")) {
      pendentes.push({ conversa, tipo: "6h" })
    } else if (ultimaMsg < ha1hDate && !followUps.includes("1h")) {
      pendentes.push({ conversa, tipo: "1h" })
    }
  }

  return pendentes
}

async function gerarMensagemFollowUp(
  lead: LeadAgente,
  tipo: "1h" | "6h" | "24h"
): Promise<string> {
  const nome = lead.nome.replace(/^WhatsApp\s+/, "") || "paciente"
  const procedimento = lead.procedimentoInteresse || "procedimentos estéticos"

  const templates: Record<string, string> = {
    "1h": `Oi ${nome}, tudo bem? Ainda tenho algumas informações sobre ${procedimento} pra compartilhar com você. Posso te ajudar?`,
    "6h": `Oi ${nome}! Só passando pra lembrar que o Dr. Lucas é referência em ${procedimento}. A pré-consulta é gratuita e sem compromisso — quer agendar?`,
    "24h": `Oi ${nome}! Vou deixar o espaço aberto por aqui, mas se quiser conversar sobre ${procedimento} ou agendar uma consulta, é só chamar! Estarei por aqui.`,
  }

  try {
    const regraSemEmojis = "PROIBIDO usar emojis (😊, 🙂, ❤️, etc). Transmita acolhimento pelas palavras, nunca por emoji."
    const prompts: Record<string, string> = {
      "1h": `Escreva uma mensagem curta de follow-up leve e amigável no WhatsApp para ${nome}, que demonstrou interesse em ${procedimento} mas parou de responder há 1 hora. Tom acolhedor, informal, máximo 2 linhas. Não mencione preços. Você é Ana Júlia, assistente da clínica do Dr. Lucas Ferreira. ${regraSemEmojis}`,
      "6h": `Escreva uma mensagem de follow-up com valor no WhatsApp para ${nome}, que demonstrou interesse em ${procedimento} mas parou de responder há 6 horas. Mencione brevemente um benefício do procedimento e reforce que a pré-consulta é gratuita. Tom acolhedor, máximo 3 linhas. Você é Ana Júlia, assistente da clínica do Dr. Lucas Ferreira. ${regraSemEmojis}`,
      "24h": `Escreva uma mensagem de encerramento gentil no WhatsApp para ${nome}, que demonstrou interesse em ${procedimento} mas não responde há 24 horas. Deixe a porta aberta para retorno. Tom empático, máximo 2 linhas. Você é Ana Júlia, assistente da clínica do Dr. Lucas Ferreira. ${regraSemEmojis}`,
    }

    const resposta = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompts[tipo] }],
      max_tokens: 200,
      temperature: 0.8,
    })

    return resposta.choices[0]?.message?.content || templates[tipo]
  } catch {
    return templates[tipo]
  }
}

export async function enviarFollowUp(
  conversa: ConversaComLead,
  tipo: "1h" | "6h" | "24h",
  configWa: ConfigWhatsappAtivo
): Promise<void> {
  const mensagem = await gerarMensagemFollowUp(conversa.lead, tipo)

  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken!,
    conversa.lead.whatsapp,
    mensagem
  )

  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
  try {
    await fetch(`${baseUrl}/api/agente/registrar-mensagem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.API_SECRET || "",
      },
      body: JSON.stringify({
        conversaId: conversa.id,
        contatoId: conversa.contatoId,
        conteudo: mensagem,
        direcao: "agente",
      }),
    })
  } catch {
    // Não impedir fluxo se registro falhar
  }

  const novosFollowUps = [...conversa.followUpEnviados, tipo]
  await supabaseAdmin
    .from("conversas")
    .update({ followUpEnviados: novosFollowUps, atualizadoEm: agora() })
    .eq("id", conversa.id)

  if (tipo === "24h") {
    await supabaseAdmin
      .from("conversas")
      .update({ encerradaEm: agora(), atualizadoEm: agora() })
      .eq("id", conversa.id)
  }
}
