import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { leadId } = await params

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      conversas: {
        include: {
          mensagens: {
            select: {
              id: true,
              tipo: true,
              conteudo: true,
              remetente: true,
              criadoEm: true,
            },
          },
        },
      },
      agendamentos: {
        select: {
          id: true,
          dataHora: true,
          status: true,
          observacao: true,
          criadoEm: true,
        },
      },
      fotos: {
        select: {
          id: true,
          url: true,
          descricao: true,
          tipoAnalise: true,
          criadoEm: true,
        },
      },
    },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const payload = {
    exportadoEm: new Date().toISOString(),
    dadosPessoais: {
      id: lead.id,
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      email: lead.email,
      procedimentoInteresse: lead.procedimentoInteresse,
      origem: lead.origem,
      sobreOPaciente: lead.sobreOPaciente,
      consentimentoLgpd: lead.consentimentoLgpd,
      consentimentoLgpdEm: lead.consentimentoLgpdEm,
      criadoEm: lead.criadoEm,
    },
    conversas: lead.conversas.map((c) => ({
      id: c.id,
      etapa: c.etapa,
      criadoEm: c.criadoEm,
      mensagens: c.mensagens,
    })),
    agendamentos: lead.agendamentos,
    fotos: lead.fotos.map((f) => ({
      id: f.id,
      url: f.url,
      descricao: f.descricao,
      tipoAnalise: f.tipoAnalise,
      criadoEm: f.criadoEm,
    })),
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lead-${leadId}-dados.json"`,
    },
  })
}
