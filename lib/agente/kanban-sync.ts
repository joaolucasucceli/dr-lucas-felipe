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
