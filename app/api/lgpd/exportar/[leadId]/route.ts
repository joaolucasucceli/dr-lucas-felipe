import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { leadId } = await params

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(`
      *,
      conversas(id, etapa, criadoEm, mensagens:mensagens_whatsapp(id, tipo, conteudo, remetente, criadoEm)),
      agendamentos(id, dataHora, status, observacao, criadoEm),
      fotos:fotos_lead(id, url, descricao, tipoAnalise, criadoEm)
    `)
    .eq("id", leadId)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  type ConversaPayload = {
    id: string
    etapa: string
    criadoEm: string
    mensagens: Array<{
      id: string
      tipo: string
      conteudo: string
      remetente: string
      criadoEm: string
    }>
  }

  type AgendamentoPayload = {
    id: string
    dataHora: string
    status: string
    observacao: string | null
    criadoEm: string
  }

  type FotoPayload = {
    id: string
    url: string
    descricao: string | null
    tipoAnalise: string | null
    criadoEm: string
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
    conversas: ((lead.conversas as ConversaPayload[]) ?? []).map((c) => ({
      id: c.id,
      etapa: c.etapa,
      criadoEm: c.criadoEm,
      mensagens: c.mensagens ?? [],
    })),
    agendamentos: (lead.agendamentos as AgendamentoPayload[]) ?? [],
    fotos: ((lead.fotos as FotoPayload[]) ?? []).map((f) => ({
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
