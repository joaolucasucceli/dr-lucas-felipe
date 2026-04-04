import { prisma } from "@/lib/prisma"
import { enviarMensagem } from "@/lib/uazapi"
import type { Agendamento, Lead, ConfigWhatsapp } from "@/generated/prisma/client"

type AgendamentoComLead = Agendamento & { lead: Lead }

type TipoConfirmacao = "6h" | "3h" | "30min"

interface ConfirmacaoPendente {
  agendamento: AgendamentoComLead
  tipo: TipoConfirmacao
}

/** Busca agendamentos que precisam de confirmação */
export async function buscarAgendamentosParaConfirmacao(): Promise<ConfirmacaoPendente[]> {
  const agora = new Date()
  const em7h = new Date(agora.getTime() + 7 * 60 * 60 * 1000)

  // Buscar agendamentos ativos nas próximas 7h
  const agendamentos = await prisma.agendamento.findMany({
    where: {
      status: { in: ["agendado", "remarcado"] },
      dataHora: {
        gt: agora,
        lt: em7h,
      },
    },
    include: {
      lead: true,
    },
  })

  const pendentes: ConfirmacaoPendente[] = []

  for (const agendamento of agendamentos) {
    const diffMs = agendamento.dataHora.getTime() - agora.getTime()
    const diffHoras = diffMs / (60 * 60 * 1000)
    const diffMinutos = diffMs / (60 * 1000)

    // 6h: faltam 6-7h
    if (
      diffHoras >= 6 &&
      diffHoras < 7 &&
      !agendamento.confirmacoesEnviadas.includes("6h")
    ) {
      pendentes.push({ agendamento, tipo: "6h" })
    }
    // 3h: faltam 3-4h
    else if (
      diffHoras >= 3 &&
      diffHoras < 4 &&
      !agendamento.confirmacoesEnviadas.includes("3h")
    ) {
      pendentes.push({ agendamento, tipo: "3h" })
    }
    // 30min: faltam 30-60min
    else if (
      diffMinutos >= 30 &&
      diffMinutos < 60 &&
      !agendamento.confirmacoesEnviadas.includes("30min")
    ) {
      pendentes.push({ agendamento, tipo: "30min" })
    }
  }

  return pendentes
}

/** Formata hora no padrão brasileiro */
function formatarHora(data: Date): string {
  return data.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Gera mensagem de confirmação */
function gerarMensagemConfirmacao(
  lead: Lead,
  dataHora: Date,
  tipo: TipoConfirmacao
): string {
  const nome = lead.nome.replace(/^WhatsApp\s+/, "") || "paciente"
  const hora = formatarHora(dataHora)

  const mensagens: Record<TipoConfirmacao, string> = {
    "6h": `Oi ${nome}! 😊 Lembrete: você tem consulta com Dr. Lucas hoje às ${hora}. Confirma presença?`,
    "3h": `Oi ${nome}, só passando para confirmar: são ${hora} com o Dr. Lucas hoje! ✅ Tudo certo?`,
    "30min": `Oi ${nome}! Sua consulta com Dr. Lucas é em aproximadamente 30 minutos! Qualquer dúvida é só chamar 😊`,
  }

  return mensagens[tipo]
}

/** Envia confirmação e registra no banco */
export async function enviarConfirmacao(
  agendamento: AgendamentoComLead,
  tipo: TipoConfirmacao,
  configWa: ConfigWhatsapp
): Promise<void> {
  const mensagem = gerarMensagemConfirmacao(
    agendamento.lead,
    agendamento.dataHora,
    tipo
  )

  // Enviar via Uazapi
  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken!,
    agendamento.lead.whatsapp,
    mensagem
  )

  // Registrar no banco
  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
  try {
    await fetch(`${baseUrl}/api/agente/registrar-mensagem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.API_SECRET || "",
      },
      body: JSON.stringify({
        leadId: agendamento.leadId,
        conteudo: mensagem,
        direcao: "agente",
      }),
    })
  } catch {
    // Não impedir fluxo se registro falhar
  }

  // Marcar confirmação como enviada
  await prisma.agendamento.update({
    where: { id: agendamento.id },
    data: {
      confirmacoesEnviadas: { push: tipo },
    },
  })
}
