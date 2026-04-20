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

  const { data: contatoExistente } = await supabaseAdmin
    .from("contatos")
    .select("*")
    .eq("whatsapp", whatsapp)
    .is("deletadoEm", null)
    .maybeSingle()

  let contato = contatoExistente

  if (!contato) {
    const { data: usuarioIa } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("tipo", "ia")
      .eq("ativo", true)
      .is("deletadoEm", null)
      .maybeSingle()

    if (!usuarioIa) {
      console.warn("[consultar-paciente] Nenhum usuário IA ativo encontrado — contato será criado sem responsável")
    }

    const { data: novoContato, error: criarError } = await supabaseAdmin
      .from("contatos")
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

    if (criarError || !novoContato) {
      return NextResponse.json(
        { error: criarError?.message || "Erro ao criar contato" },
        { status: 500 }
      )
    }

    contato = novoContato
  }

  const { data: conversa } = await supabaseAdmin
    .from("conversas")
    .select("id, etapa")
    .eq("contatoId", contato.id)
    .eq("ciclo", contato.cicloAtual)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  let ultimoProcedimento: string | null = null
  if (contato.ehRetorno && contato.ciclosCompletos > 0) {
    const { data: agendamentoCicloAnterior } = await supabaseAdmin
      .from("agendamentos")
      .select("procedimento:procedimentos(nome)")
      .eq("contatoId", contato.id)
      .eq("ciclo", contato.cicloAtual - 1)
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
    contato: {
      id: contato.id,
      nome: contato.nome,
      whatsapp: contato.whatsapp,
      statusFunil: contato.statusFunil,
      procedimentoInteresse: contato.procedimentoInteresse,
      origem: contato.origem,
      ehRetorno: contato.ehRetorno,
      cicloAtual: contato.cicloAtual,
      ciclosCompletos: contato.ciclosCompletos,
      responsavelId: contato.responsavelId,
    },
    conversa: conversa ? { id: conversa.id, etapa: conversa.etapa } : null,
    sobreOPaciente: contato.sobreOPaciente || null,
    ultimoProcedimento,
  })
}
