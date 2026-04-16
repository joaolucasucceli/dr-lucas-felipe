import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarId, agora } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { whatsapp?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const { whatsapp } = body
  if (!whatsapp) {
    return NextResponse.json({ error: "whatsapp é obrigatório" }, { status: 400 })
  }

  const { data: leadExistente } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("whatsapp", whatsapp)
    .maybeSingle()

  let lead = leadExistente

  if (!lead) {
    const { data: usuarioIa } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("tipo", "ia")
      .eq("ativo", true)
      .is("deletadoEm", null)
      .maybeSingle()

    if (!usuarioIa) {
      console.warn("[consultar-paciente] Nenhum usuário IA ativo encontrado — lead será criado sem responsável")
    }

    const { data: novoLead, error: criarError } = await supabaseAdmin
      .from("leads")
      .insert({
        id: criarId(),
        atualizadoEm: agora(),
        nome: `WhatsApp ${whatsapp}`,
        whatsapp,
        origem: "whatsapp",
        statusFunil: "acolhimento",
        responsavelId: usuarioIa?.id || null,
      })
      .select("*")
      .single()

    if (criarError || !novoLead) {
      return NextResponse.json(
        { error: criarError?.message || "Erro ao criar lead" },
        { status: 500 }
      )
    }

    lead = novoLead
  }

  const { data: conversa } = await supabaseAdmin
    .from("conversas")
    .select("id, etapa")
    .eq("leadId", lead.id)
    .eq("ciclo", lead.cicloAtual)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  let ultimoProcedimento: string | null = null
  if (lead.ehRetorno && lead.ciclosCompletos > 0) {
    const { data: agendamentoCicloAnterior } = await supabaseAdmin
      .from("agendamentos")
      .select("procedimento:procedimentos(nome)")
      .eq("leadId", lead.id)
      .eq("ciclo", lead.cicloAtual - 1)
      .eq("status", "realizado")
      .not("procedimentoId", "is", null)
      .order("dataHora", { ascending: false })
      .limit(1)
      .maybeSingle()

    const proc = agendamentoCicloAnterior?.procedimento as
      | { nome: string }
      | null
      | undefined
    ultimoProcedimento = proc?.nome ?? null
  }

  return NextResponse.json({
    lead: {
      id: lead.id,
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      statusFunil: lead.statusFunil,
      procedimentoInteresse: lead.procedimentoInteresse,
      origem: lead.origem,
      ehRetorno: lead.ehRetorno,
      cicloAtual: lead.cicloAtual,
      ciclosCompletos: lead.ciclosCompletos,
      responsavelId: lead.responsavelId,
    },
    conversa: conversa ? { id: conversa.id, etapa: conversa.etapa } : null,
    sobreOPaciente: lead.sobreOPaciente || null,
    ultimoProcedimento,
  })
}
