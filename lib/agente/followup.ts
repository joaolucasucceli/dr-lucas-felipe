import { prisma } from "@/lib/prisma"
import { openai } from "@/lib/openai"
import { enviarMensagem } from "@/lib/uazapi"
import type { Conversa, Lead, ConfigWhatsapp } from "@/generated/prisma/client"

type ConversaComLead = Conversa & { lead: Lead }

interface FollowUpPendente {
  conversa: ConversaComLead
  tipo: "1h" | "6h" | "24h"
}

/** Busca conversas que precisam de follow-up */
export async function buscarConversasParaFollowUp(): Promise<FollowUpPendente[]> {
  const agora = new Date()
  const ha1h = new Date(agora.getTime() - 1 * 60 * 60 * 1000)

  // Buscar conversas ativas com ultimaMensagemEm > 1h atrás
  const conversas = await prisma.conversa.findMany({
    where: {
      encerradaEm: null,
      ultimaMensagemEm: {
        not: null,
        lt: ha1h,
      },
      etapa: {
        in: ["acolhimento", "qualificacao", "agendamento"],
      },
      lead: {
        arquivado: false,
        deletadoEm: null,
      },
    },
    include: {
      lead: true,
    },
  })

  const pendentes: FollowUpPendente[] = []
  const ha6h = new Date(agora.getTime() - 6 * 60 * 60 * 1000)
  const ha24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000)

  for (const conversa of conversas) {
    const ultimaMsg = conversa.ultimaMensagemEm!

    // Priorizar o mais urgente (24h > 6h > 1h)
    if (ultimaMsg < ha24h && !conversa.followUpEnviados.includes("24h")) {
      pendentes.push({ conversa, tipo: "24h" })
    } else if (ultimaMsg < ha6h && !conversa.followUpEnviados.includes("6h")) {
      pendentes.push({ conversa, tipo: "6h" })
    } else if (ultimaMsg < ha1h && !conversa.followUpEnviados.includes("1h")) {
      pendentes.push({ conversa, tipo: "1h" })
    }
  }

  return pendentes
}

/** Gera mensagem de follow-up via GPT-4o com fallback para template */
async function gerarMensagemFollowUp(
  lead: Lead,
  tipo: "1h" | "6h" | "24h"
): Promise<string> {
  const nome = lead.nome.replace(/^WhatsApp\s+/, "") || "paciente"
  const procedimento = lead.procedimentoInteresse || "procedimentos estéticos"

  // Templates de fallback
  const templates: Record<string, string> = {
    "1h": `Oi ${nome}, tudo bem? 😊 Ainda tenho algumas informações sobre ${procedimento} pra compartilhar com você. Posso te ajudar?`,
    "6h": `Oi ${nome}! Só passando pra lembrar que o Dr. Lucas é referência em ${procedimento}. A pré-consulta é gratuita e sem compromisso — quer agendar? 😊`,
    "24h": `Oi ${nome}! Vou deixar o espaço aberto por aqui, mas se quiser conversar sobre ${procedimento} ou agendar uma consulta, é só chamar! Estarei por aqui 😊`,
  }

  try {
    const prompts: Record<string, string> = {
      "1h": `Escreva uma mensagem curta de follow-up leve e amigável no WhatsApp para ${nome}, que demonstrou interesse em ${procedimento} mas parou de responder há 1 hora. Tom acolhedor, informal, máximo 2 linhas. Não mencione preços. Você é Ana Júlia, assistente da clínica do Dr. Lucas Felipe.`,
      "6h": `Escreva uma mensagem de follow-up com valor no WhatsApp para ${nome}, que demonstrou interesse em ${procedimento} mas parou de responder há 6 horas. Mencione brevemente um benefício do procedimento e reforce que a pré-consulta é gratuita. Tom acolhedor, máximo 3 linhas. Você é Ana Júlia, assistente da clínica do Dr. Lucas Felipe.`,
      "24h": `Escreva uma mensagem de encerramento gentil no WhatsApp para ${nome}, que demonstrou interesse em ${procedimento} mas não responde há 24 horas. Deixe a porta aberta para retorno. Tom empático, máximo 2 linhas. Você é Ana Júlia, assistente da clínica do Dr. Lucas Felipe.`,
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

/** Envia follow-up e registra no banco */
export async function enviarFollowUp(
  conversa: ConversaComLead,
  tipo: "1h" | "6h" | "24h",
  configWa: ConfigWhatsapp
): Promise<void> {
  const mensagem = await gerarMensagemFollowUp(conversa.lead, tipo)

  // Enviar via Uazapi
  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken!,
    conversa.lead.whatsapp,
    mensagem
  )

  // Registrar no banco via API interna
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
        leadId: conversa.leadId,
        conteudo: mensagem,
        direcao: "agente",
      }),
    })
  } catch {
    // Não impedir fluxo se registro falhar
  }

  // Marcar follow-up como enviado
  await prisma.conversa.update({
    where: { id: conversa.id },
    data: {
      followUpEnviados: { push: tipo },
    },
  })

  // Se follow-up 24h: encerrar conversa
  if (tipo === "24h") {
    await prisma.conversa.update({
      where: { id: conversa.id },
      data: { encerradaEm: new Date() },
    })
  }
}
