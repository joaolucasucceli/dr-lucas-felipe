import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import type { StatusFunil } from "@/generated/prisma/client"

const ETAPAS_FUNIL: StatusFunil[] = [
  "primeiro_atendimento",
  "qualificacao",
  "agendamento",
  "consulta_agendada",
  "consulta_realizada",
  "sinal_pago",
  "procedimento_agendado",
  "concluido",
  "perdido",
]

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const responsavelId = searchParams.get("responsavelId")
  const procedimentoInteresse = searchParams.get("procedimentoInteresse")

  const where: Record<string, unknown> = {
    deletadoEm: null,
    arquivado: false,
  }

  if (responsavelId) {
    where.responsavelId = responsavelId
  }

  if (procedimentoInteresse) {
    where.procedimentoInteresse = { contains: procedimentoInteresse, mode: "insensitive" }
  }

  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      nome: true,
      whatsapp: true,
      procedimentoInteresse: true,
      statusFunil: true,
      criadoEm: true,
      atualizadoEm: true,
      ultimaMovimentacaoEm: true,
      motivoPerda: true,
      responsavel: { select: { id: true, nome: true } },
      conversa: { select: { followUpEnviados: true } },
    },
    orderBy: { atualizadoEm: "desc" },
  })

  const agora = Date.now()
  const colunas: Record<string, unknown[]> = {}

  for (const etapa of ETAPAS_FUNIL) {
    colunas[etapa] = []
  }

  for (const { conversa, ...lead } of leads) {
    const referencia = lead.ultimaMovimentacaoEm || lead.atualizadoEm
    const diasNaEtapa = Math.floor((agora - referencia.getTime()) / 86400000)

    colunas[lead.statusFunil].push({
      ...lead,
      diasNaEtapa,
      followUpEnviados: conversa?.followUpEnviados ?? [],
    })
  }

  return NextResponse.json({
    colunas,
    total: leads.length,
  })
}
