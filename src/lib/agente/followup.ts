import { supabaseAdmin } from "@/lib/supabase"
import { openai } from "@/lib/openai"
import { enviarMensagem } from "@/lib/uazapi"
import { agora, instanteDoBanco } from "@/lib/db-utils"
import type { ContatoAgente, ConfigWhatsappAtivo } from "./types"

interface ConversaComContato {
  id: string
  contatoId: string
  ultimaMensagemEm: string | null
  followUpEnviados: string[]
  contato: ContatoAgente
}

interface FollowUpPendente {
  conversa: ConversaComContato
  tipo: "24h" | "48h_encerramento"
}

export async function buscarConversasParaFollowUp(): Promise<FollowUpPendente[]> {
  const agoraTs = new Date()
  const ha24hIso = new Date(agoraTs.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data: conversas, error } = await supabaseAdmin
    .from("conversas")
    .select(`
      id,
      contatoId,
      ultimaMensagemEm,
      followUpEnviados,
      etapa,
      contato:contatos!conversas_contatoId_fkey(id, nome, whatsapp, procedimentoInteresse, arquivado, deletadoEm)
    `)
    .is("encerradaEm", null)
    .not("ultimaMensagemEm", "is", null)
    .lt("ultimaMensagemEm", ha24hIso)
    .in("etapa", ["acolhimento", "qualificacao", "orcamento", "agendamento"] as never)

  if (error || !conversas) return []

  type ContatoRaw = ContatoAgente & { arquivado: boolean; deletadoEm: string | null }
  type ConversaRaw = {
    id: string
    contatoId: string
    ultimaMensagemEm: string | null
    followUpEnviados: string[] | null
    contato: ContatoRaw | ContatoRaw[] | null
  }

  const pendentes: FollowUpPendente[] = []
  const ha24h = new Date(agoraTs.getTime() - 24 * 60 * 60 * 1000)
  const ha48h = new Date(agoraTs.getTime() - 48 * 60 * 60 * 1000)

  for (const conversaRaw of conversas as unknown as ConversaRaw[]) {
    const contatoRaw = Array.isArray(conversaRaw.contato) ? conversaRaw.contato[0] : conversaRaw.contato
    if (!contatoRaw || contatoRaw.arquivado || contatoRaw.deletadoEm) continue
    if (!conversaRaw.ultimaMensagemEm) continue

    const { data: agendamentoAtivo } = await supabaseAdmin
      .from("agendamentos")
      .select("id")
      .eq("contatoId", conversaRaw.contatoId)
      .in("status", ["agendado", "remarcado"] as never)
      .limit(1)
      .maybeSingle()

    if (agendamentoAtivo) continue

    // `conversas.ultimaMensagemEm` e `timestamp WITHOUT time zone` guardando
    // UTC: `new Date()` direto interpretaria pelo fuso do processo e deslocaria
    // a janela de 24h/48h. Ver `instanteDoBanco`.
    const ultimaMsg = new Date(instanteDoBanco(conversaRaw.ultimaMensagemEm))
    const followUps = conversaRaw.followUpEnviados ?? []

    const conversa: ConversaComContato = {
      id: conversaRaw.id,
      contatoId: conversaRaw.contatoId,
      ultimaMensagemEm: conversaRaw.ultimaMensagemEm,
      followUpEnviados: followUps,
      contato: {
        id: contatoRaw.id,
        nome: contatoRaw.nome,
        whatsapp: contatoRaw.whatsapp,
        procedimentoInteresse: contatoRaw.procedimentoInteresse,
      },
    }

    if (ultimaMsg < ha48h && !followUps.includes("48h_encerramento")) {
      pendentes.push({ conversa, tipo: "48h_encerramento" })
    } else if (ultimaMsg < ha24h && !followUps.includes("24h")) {
      pendentes.push({ conversa, tipo: "24h" })
    }
  }

  return pendentes
}

async function gerarMensagemFollowUp(
  contato: ContatoAgente,
  tipo: "24h" | "48h_encerramento"
): Promise<string> {
  const nome = contato.nome.replace(/^WhatsApp\s+/, "") || "paciente"
  const procedimento = contato.procedimentoInteresse || "procedimentos estéticos"

  const templates: Record<string, string> = {
    "24h": `Oi ${nome}! Passando pra saber se você ainda quer seguir com as informações sobre ${procedimento}. Posso te ajudar por aqui.`,
    "48h_encerramento": `Oi ${nome}! Vou encerrar seu atendimento por aqui por enquanto. Se quiser retomar sobre ${procedimento}, é só me chamar.`,
  }

  try {
    const regraSemEmojis = "PROIBIDO usar emojis (😊, 🙂, ❤️, etc). Transmita acolhimento pelas palavras, nunca por emoji."
    const prompts: Record<string, string> = {
      "24h": `Escreva uma mensagem curta de follow-up em WhatsApp para ${nome}, que demonstrou interesse em ${procedimento} mas parou de responder há 24 horas. Tom acolhedor, máximo 2 linhas. Não mencione preços. Você é Ana Júlia, assistente da clínica do Dr. Lucas Ferreira. ${regraSemEmojis}`,
      "48h_encerramento": `Escreva uma mensagem curta de encerramento gentil no WhatsApp para ${nome}, que demonstrou interesse em ${procedimento} mas não responde há 48 horas. Deixe a porta aberta para retorno. Tom empático, máximo 2 linhas. Você é Ana Júlia, assistente da clínica do Dr. Lucas Ferreira. ${regraSemEmojis}`,
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
  conversa: ConversaComContato,
  tipo: "24h" | "48h_encerramento",
  configWa: ConfigWhatsappAtivo
): Promise<void> {
  const mensagem = await gerarMensagemFollowUp(conversa.contato, tipo)

  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken!,
    conversa.contato.whatsapp,
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

  if (tipo === "48h_encerramento") {
    await supabaseAdmin
      .from("conversas")
      .update({ encerradaEm: agora(), atualizadoEm: agora() })
      .eq("id", conversa.id)
  }
}
