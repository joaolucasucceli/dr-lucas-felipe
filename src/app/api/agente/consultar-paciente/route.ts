import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarId, agora } from "@/lib/db-utils"
import { buscarContatoAtivoPorWhatsappNormalizado } from "@/lib/contatos/whatsapp"
import type { Database } from "@/lib/types/database"

const SELECT_CONTATO =
  "id, nome, whatsapp, email, tipo, statusFunil, procedimentoInteresse, origem, ehRetorno, cicloAtual, ciclosCompletos, responsavelId, sobreOPaciente"

type ContatoRow = Database["public"]["Tables"]["contatos"]["Row"]
type ContatoConsulta = Pick<
  ContatoRow,
  | "id"
  | "nome"
  | "whatsapp"
  | "email"
  | "tipo"
  | "statusFunil"
  | "procedimentoInteresse"
  | "origem"
  | "ehRetorno"
  | "cicloAtual"
  | "ciclosCompletos"
  | "responsavelId"
  | "sobreOPaciente"
>

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

  const { contato: contatoExistente, error: buscarError } =
    await buscarContatoAtivoPorWhatsappNormalizado<ContatoConsulta>(
      whatsapp,
      SELECT_CONTATO
    )

  if (buscarError) {
    return NextResponse.json(
      { error: buscarError.message },
      { status: 500 }
    )
  }

  let contato = contatoExistente
  let criadoAgora = false

  if (!contato) {
    const { data: novoContato, error: criarError } = await supabaseAdmin
      .from("contatos")
      .insert({
        id: criarId(),
        atualizadoEm: agora(),
        tipo: "lead",
        nome: `WhatsApp ${whatsapp}`,
        whatsapp,
        origem: "whatsapp",
        statusFunil: "acolhimento",
      })
      .select(SELECT_CONTATO)
      .single()

    if (criarError || !novoContato) {
      return NextResponse.json(
        { error: criarError?.message || "Erro ao criar contato" },
        { status: 500 }
      )
    }

    contato = novoContato
    criadoAgora = true
  }

  if (!contato) {
    return NextResponse.json({ error: "Contato nao encontrado" }, { status: 500 })
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
      email: contato.email,
      tipo: contato.tipo,
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
    criadoAgora,
  })
}
