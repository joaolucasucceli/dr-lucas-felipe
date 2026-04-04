import { openai } from "@/lib/openai"
import { prisma } from "@/lib/prisma"
import { sincronizarFunil, avancarEtapa } from "@/lib/agente/kanban-sync"
import type { StatusFunil, EtapaConversa } from "@/generated/prisma/client"

const ETAPAS_CLASSIFICAVEIS: StatusFunil[] = [
  "acolhimento",
  "qualificacao",
  "agendamento",
]

const LIMITE_CLASSIFICAVEL: StatusFunil = "consulta_agendada"

function etapaIndex(etapa: StatusFunil): number {
  const ordem: StatusFunil[] = [
    "acolhimento",
    "qualificacao",
    "agendamento",
    "consulta_agendada",
    "consulta_realizada",
    "sinal_pago",
    "procedimento_agendado",
    "concluido",
    "perdido",
  ]
  return ordem.indexOf(etapa)
}

/**
 * Analisa o histórico de conversa e avança automaticamente a etapa do funil.
 * Só opera nas etapas 1-4 (acolhimento até consulta_agendada).
 * Nunca regride — só avança.
 */
export async function classificarEtapaConversa(
  conversaId: string,
  leadId: string
): Promise<void> {
  const [lead] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: { statusFunil: true },
    }),
  ])

  if (!lead) return

  const etapaAtual = lead.statusFunil

  // Território manual — não interferir
  if (etapaIndex(etapaAtual) >= etapaIndex(LIMITE_CLASSIFICAVEL)) return

  // Verificação determinística: agendamento ativo no banco
  const agendamentoAtivo = await prisma.agendamento.findFirst({
    where: { leadId, status: "agendado" },
    select: { id: true },
  })

  if (agendamentoAtivo) {
    await sincronizarFunil(leadId, "consulta_agendada")
    await avancarEtapa(conversaId, "consulta_agendada" as EtapaConversa)
    return
  }

  // Buscar últimas 15 mensagens (ordem cronológica)
  const mensagens = await prisma.mensagemWhatsapp.findMany({
    where: { conversaId },
    orderBy: { criadoEm: "desc" },
    take: 15,
    select: { remetente: true, conteudo: true },
  })

  if (mensagens.length === 0) return

  const historico = mensagens
    .reverse()
    .map((m) => `${m.remetente === "agente" ? "Ana Júlia" : "Paciente"}: ${m.conteudo}`)
    .join("\n")

  let novaEtapa: StatusFunil | null = null

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analise o histórico de conversa de atendimento de uma clínica médica estética e classifique em qual etapa a conversa está.

Etapas possíveis:
- "acolhimento": Apenas saudações iniciais, o paciente ainda não compartilhou informações substantivas sobre si ou seu interesse.
- "qualificacao": Paciente está compartilhando informações sobre si (nome, interesse, procedimento, histórico, expectativas), mas datas ou horários ainda não foram discutidos.
- "agendamento": A conversa está ativamente discutindo disponibilidade, datas ou horários específicos para marcar uma consulta.

Responda APENAS com JSON válido: { "etapa": "acolhimento" | "qualificacao" | "agendamento", "motivo": "explicação curta" }`,
        },
        {
          role: "user",
          content: historico,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    })

    const resultado = JSON.parse(completion.choices[0]?.message?.content || "{}")
    if (ETAPAS_CLASSIFICAVEIS.includes(resultado.etapa as StatusFunil)) {
      novaEtapa = resultado.etapa as StatusFunil
    }
  } catch (err) {
    console.error("[classificador-etapa] Erro na classificação IA:", err)
    return
  }

  if (!novaEtapa) return

  // Regra de não-regressão: só avança
  if (etapaIndex(novaEtapa) <= etapaIndex(etapaAtual)) return

  await sincronizarFunil(leadId, novaEtapa)
  await avancarEtapa(conversaId, novaEtapa as EtapaConversa)
}
