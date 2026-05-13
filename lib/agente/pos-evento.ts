import { supabaseAdmin } from "@/lib/supabase"
import { enviarMensagem } from "@/lib/uazapi"
import { agora } from "@/lib/db-utils"
import type { ContatoAgente, ConfigWhatsappAtivo } from "./types"

/**
 * Pos-evento: 1h apos `dataHora` do agendamento, Ana Julia pergunta se o
 * paciente compareceu. Se "sim" -> conversa encerrada + status `realizado`
 * (IA para de responder). Se "nao" -> status `nao_compareceu` + IA reabre
 * fluxo de remarcacao no proximo turno.
 *
 * O cron busca agendamentos elegiveis aqui; quem detecta a resposta do
 * paciente e atua e o webhook handler (lib/agente/loop.ts), olhando o
 * agendamento mais recente da conversa cujo posEventoEnviado e NOT NULL.
 */

interface AgendamentoPosEvento {
  id: string
  contatoId: string
  dataHora: string
  contato: ContatoAgente
}

export async function buscarAgendamentosParaPosEvento(): Promise<
  AgendamentoPosEvento[]
> {
  const agoraTs = new Date()
  // Janela: agendamento que ja terminou (dataHora + 1h < now) ate 12h depois.
  // Limite superior evita re-disparar pra agendamentos esquecidos no banco.
  const limiteSuperiorMs = agoraTs.getTime() - 1 * 60 * 60 * 1000
  const limiteInferiorMs = agoraTs.getTime() - 12 * 60 * 60 * 1000

  // Filtra criadoPor='ia': mesmo criterio do confirmacao.ts. Manuais
  // ficam fora porque a IA nao tem contexto da conversa pra responder
  // ao "sim/nao" do paciente.
  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .select(`
      id,
      contatoId,
      dataHora,
      status,
      posEventoEnviado,
      contato:contatos!agendamentos_contatoId_fkey(id, nome, whatsapp)
    `)
    .in("status", ["agendado", "confirmado", "remarcado"])
    .eq("criadoPor", "ia")
    .is("posEventoEnviado", null)
    .gt("dataHora", new Date(limiteInferiorMs).toISOString())
    .lt("dataHora", new Date(limiteSuperiorMs).toISOString())

  if (error || !data) return []

  type AgendamentoRaw = {
    id: string
    contatoId: string
    dataHora: string
    status: string
    posEventoEnviado: string | null
    contato: ContatoAgente | ContatoAgente[] | null
  }

  const pendentes: AgendamentoPosEvento[] = []
  for (const ag of data as unknown as AgendamentoRaw[]) {
    const contatoRaw = Array.isArray(ag.contato) ? ag.contato[0] : ag.contato
    if (!contatoRaw) continue

    pendentes.push({
      id: ag.id,
      contatoId: ag.contatoId,
      dataHora: ag.dataHora,
      contato: contatoRaw,
    })
  }

  return pendentes
}

function gerarMensagemPosEvento(contato: ContatoAgente): string {
  const nome = contato.nome.replace(/^WhatsApp\s+/, "") || "paciente"
  return `Oi ${nome}, tudo bem? Conseguiu fazer a avaliação com o Dr. Lucas hoje? Queria entender se ficou alguma dúvida ou se precisa de algum próximo passo.`
}

export async function enviarPosEvento(
  agendamento: AgendamentoPosEvento,
  configWa: ConfigWhatsappAtivo
): Promise<void> {
  const mensagem = gerarMensagemPosEvento(agendamento.contato)

  // Idempotencia: marca como enviado ANTES de qualquer chamada externa.
  // Se Uazapi falhar (whatsapp invalido, instancia desconectada, rede), a
  // marca persiste e o cron nao tenta de novo amanha. Mensagem perdida e
  // melhor que mensagem dupla — paciente recebe nada vs paciente recebe 5x.
  await supabaseAdmin
    .from("agendamentos")
    .update({ posEventoEnviado: agora(), atualizadoEm: agora() })
    .eq("id", agendamento.id)

  await enviarMensagem(
    configWa.uazapiUrl,
    configWa.instanceToken!,
    agendamento.contato.whatsapp,
    mensagem
  )

  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").trim()
  try {
    // Busca conversa ativa pra registrar a mensagem no historico.
    const { data: conversa } = await supabaseAdmin
      .from("conversas")
      .select("id")
      .eq("contatoId", agendamento.contatoId)
      .is("encerradaEm", null)
      .order("ultimaMensagemEm", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (conversa) {
      await fetch(`${baseUrl}/api/agente/registrar-mensagem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-secret": process.env.API_SECRET || "",
        },
        body: JSON.stringify({
          conversaId: conversa.id,
          contatoId: agendamento.contatoId,
          conteudo: mensagem,
          direcao: "agente",
        }),
      })
    }
  } catch {
    // Nao impedir fluxo se registro falhar
  }
}
