import { prisma } from "@/lib/prisma"
import type { StatusFunil, EtapaConversa } from "@/generated/prisma/client"

/** Atualiza o statusFunil de um lead + ultimaMovimentacaoEm */
export async function sincronizarFunil(
  leadId: string,
  novoStatus: StatusFunil
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      statusFunil: novoStatus,
      ultimaMovimentacaoEm: new Date(),
    },
  })
}

/** Avança a etapa de uma conversa */
export async function avancarEtapa(
  conversaId: string,
  novaEtapa: EtapaConversa
): Promise<void> {
  await prisma.conversa.update({
    where: { id: conversaId },
    data: { etapa: novaEtapa },
  })
}

interface ResultadoNovoCiclo {
  conversaId: string
  cicloAtual: number
  statusAnterior: StatusFunil
}

/**
 * Abre um novo ciclo de atendimento para um lead que retornou (concluido ou perdido).
 * Incrementa cicloAtual, reseta statusFunil e cria nova conversa vinculada ao ciclo.
 */
export async function abrirNovoCiclo(leadId: string): Promise<ResultadoNovoCiclo> {
  // Bloquear se lead já foi convertido em paciente
  const pacienteVinculado = await prisma.paciente.findUnique({
    where: { leadOrigemId: leadId },
    select: { id: true },
  })
  if (pacienteVinculado) {
    throw new Error(
      `Lead ${leadId} já foi convertido em paciente (${pacienteVinculado.id}). Novo ciclo bloqueado.`
    )
  }

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } })

  const statusAnterior = lead.statusFunil
  const novoCiclo = lead.cicloAtual + 1
  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  })

  const notaRetorno = `\n\n[Ciclo ${novoCiclo} iniciado em ${dataFormatada}]: Paciente retornou via WhatsApp. Status anterior: ${statusAnterior}.`

  const [novaConversa] = await prisma.$transaction([
    prisma.conversa.create({
      data: {
        leadId,
        etapa: "qualificacao",
        ciclo: novoCiclo,
      },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: {
        cicloAtual: novoCiclo,
        ciclosCompletos: lead.ciclosCompletos + 1,
        ehRetorno: true,
        statusFunil: "qualificacao",
        ultimaMovimentacaoEm: new Date(),
        arquivado: false,
        arquivadoEm: null,
        sobreOPaciente: lead.sobreOPaciente
          ? `${lead.sobreOPaciente}${notaRetorno}`
          : notaRetorno.trim(),
      },
    }),
  ])

  return {
    conversaId: novaConversa.id,
    cicloAtual: novoCiclo,
    statusAnterior,
  }
}
