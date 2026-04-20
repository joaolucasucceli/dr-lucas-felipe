import { supabaseAdmin } from "@/lib/supabase"
import { enviarMensagem } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"

interface ContatoAgente {
  id: string
  nome: string
  whatsapp: string
}

interface AgendamentoComContato {
  id: string
  contatoId: string
  dataHora: string
  confirmacoesEnviadas: string[]
  contato: ContatoAgente
}

interface ConfigWhatsappAtivo {
  uazapiUrl: string
  instanceToken: string | null
}

type TipoConfirmacao = "6h" | "3h" | "30min"

interface ConfirmacaoPendente {
  agendamento: AgendamentoComContato
  tipo: TipoConfirmacao
}

export async function buscarAgendamentosParaConfirmacao(): Promise<ConfirmacaoPendente[]> {
  const agoraTs = new Date()
  const em7h = new Date(agoraTs.getTime() + 7 * 60 * 60 * 1000)

  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .select(`
      id,
      contatoId,
      dataHora,
      confirmacoesEnviadas,
      status,
      contato:contatos!agendamentos_contatoId_fkey(id, nome, whatsapp)
    `)
    .in("status", ["agendado", "remarcado"] as never)
    .gt("dataHora", agoraTs.toISOString())
    .lt("dataHora", em7h.toISOString())

  if (error || !data) return []

  type AgendamentoRaw = {
    id: string
    contatoId: string
    dataHora: string
    confirmacoesEnviadas: string[] | null
    contato: ContatoAgente | ContatoAgente[] | null
  }

  const pendentes: ConfirmacaoPendente[] = []

  for (const ag of data as unknown as AgendamentoRaw[]) {
    const contatoRaw = Array.isArray(ag.contato) ? ag.contato[0] : ag.contato
    if (!contatoRaw) continue

    const dataHora = new Date(ag.dataHora)
    const diffMs = dataHora.getTime() - agoraTs.getTime()
    const diffHoras = diffMs / (60 * 60 * 1000)
    const diffMinutos = diffMs / (60 * 1000)
    const confirmacoes = ag.confirmacoesEnviadas ?? []

    const agendamento: AgendamentoComContato = {
      id: ag.id,
      contatoId: ag.contatoId,
      dataHora: ag.dataHora,
      confirmacoesEnviadas: confirmacoes,
      contato: contatoRaw,
    }

    if (diffHoras >= 6 && diffHoras < 7 && !confirmacoes.includes("6h")) {
      pendentes.push({ agendamento, tipo: "6h" })
    } else if (diffHoras >= 3 && diffHoras < 4 && !confirmacoes.includes("3h")) {
      pendentes.push({ agendamento, tipo: "3h" })
    } else if (diffMinutos >= 30 && diffMinutos < 60 && !confirmacoes.includes("30min")) {
      pendentes.push({ agendamento, tipo: "30min" })
    }
  }

  return pendentes
}

function formatarHora(data: Date): string {
  return data.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function gerarMensagemConfirmacao(
  contato: ContatoAgente,
  dataHora: Date,
  tipo: TipoConfirmacao
): string {
  const nome = contato.nome.replace(/^WhatsApp\s+/, "") || "paciente"
  const hora = formatarHora(dataHora)

  const mensagens: Record<TipoConfirmacao, string> = {
    "6h": `Oi ${nome}! Lembrete: você tem consulta com Dr. Lucas hoje às ${hora}. Confirma presença?`,
    "3h": `Oi ${nome}, só passando para confirmar: são ${hora} com o Dr. Lucas hoje! Tudo certo?`,
    "30min": `Oi ${nome}! Sua consulta com Dr. Lucas é em aproximadamente 30 minutos. Qualquer dúvida é só chamar.`,
  }

  return mensagens[tipo]
}

export async function enviarConfirmacao(
  agendamento: AgendamentoComContato,
  tipo: TipoConfirmacao,
  configWa: ConfigWhatsappAtivo
): Promise<void> {
  const dataHora = new Date(agendamento.dataHora)
  const mensagem = gerarMensagemConfirmacao(agendamento.contato, dataHora, tipo)

  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken!,
    agendamento.contato.whatsapp,
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
        contatoId: agendamento.contatoId,
        conteudo: mensagem,
        direcao: "agente",
      }),
    })
  } catch {
    // Não impedir fluxo se registro falhar
  }

  const novasConfirmacoes = [...agendamento.confirmacoesEnviadas, tipo]
  await supabaseAdmin
    .from("agendamentos")
    .update({ confirmacoesEnviadas: novasConfirmacoes, atualizadoEm: agora() })
    .eq("id", agendamento.id)
}
