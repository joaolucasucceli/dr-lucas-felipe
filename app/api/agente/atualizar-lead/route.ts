import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import {
  aplicarMudancasLead,
  type EstadoAtualContato,
} from "@/lib/agente/atualizar-lead"
import type { StatusFunil } from "@/lib/types/enums"

const schema = z.object({
  contatoId: z.string().min(1),
  conversaId: z.string().optional(),
  nome: z.string().optional(),
  procedimentoInteresse: z.string().optional(),
  sobreOPacienteAdicionar: z.string().optional(),
  etapaCorreta: z.enum(["manter", "qualificacao", "agendamento"]).optional(),
})

/**
 * Tool `atualizar_lead` da Ana Julia. Substitui o pipeline da antiga Analista IA:
 * a propria Ana enriquece o cadastro (nome, procedimentoInteresse, sobreOPaciente)
 * e avanca o funil (acolhimento -> qualificacao -> agendamento) ao longo da conversa.
 *
 * Reusa `aplicarMudancasLead`, que respeita as transicoes validas e faz APPEND em
 * sobreOPaciente. A etapa final `consulta_agendada` NUNCA passa por aqui — so a
 * tool `registrar_agendamento` a atinge.
 */
export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const {
    contatoId,
    conversaId,
    nome,
    procedimentoInteresse,
    sobreOPacienteAdicionar,
    etapaCorreta,
  } = parsed.data

  // Le o estado atual do contato (mesmo padrao das demais rotas do agente).
  const { data: contato, error: erroContato } = await supabaseAdmin
    .from("contatos")
    .select("id, nome, statusFunil, procedimentoInteresse, sobreOPaciente")
    .eq("id", contatoId)
    .maybeSingle()

  if (erroContato) {
    return NextResponse.json({ error: erroContato.message }, { status: 500 })
  }
  if (!contato) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
  }

  const estadoAtual: EstadoAtualContato = {
    nome: contato.nome ?? "",
    statusFunil: (contato.statusFunil as StatusFunil | null) ?? null,
    procedimentoInteresse: contato.procedimentoInteresse ?? null,
    sobreOPaciente: contato.sobreOPaciente ?? null,
  }

  try {
    const resultado = await aplicarMudancasLead({
      contatoId,
      conversaId: conversaId ?? null,
      estadoAtual,
      mudancas: {
        nome,
        procedimentoInteresse,
        sobreOPacienteAdicionar,
        etapaCorreta,
      },
    })

    return NextResponse.json({ ok: true, ...resultado })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar lead"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
