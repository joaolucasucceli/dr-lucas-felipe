import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const { data: paciente } = await supabaseAdmin
    .from("contatos")
    .select("id, nome, tipo")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente || paciente.tipo !== "paciente") {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select(`
      *,
      anamnese:anamneses(*),
      evolucoes(*, procedimento:procedimentos(id, nome), registroCirurgico:registros_cirurgicos(*))
    `)
    .eq("contatoId", id)
    .maybeSingle()

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const anamneseRaw = prontuario.anamnese as unknown
  if (Array.isArray(anamneseRaw)) {
    ;(prontuario as { anamnese: unknown }).anamnese = anamneseRaw[0] ?? null
  }

  type EvolucaoOrdenavel = { dataRegistro?: string | null; deletadoEm?: string | null }
  const evolucoes = ((prontuario.evolucoes as EvolucaoOrdenavel[] | undefined) ?? [])
    .filter((e) => !e.deletadoEm)
    .slice()
    .sort((a, b) => (b.dataRegistro ?? "").localeCompare(a.dataRegistro ?? ""))

  const [documentos, fotos] = await Promise.all([
    supabaseAdmin
      .from("documentos_prontuario")
      .select("id", { count: "exact", head: true })
      .eq("prontuarioId", prontuario.id),
    supabaseAdmin
      .from("fotos_contato")
      .select("id", { count: "exact", head: true })
      .eq("contatoId", id)
      .in("categoria", ["pre_operatorio", "pos_operatorio", "acompanhamento"]),
  ])

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "visualizar",
    entidade: "Prontuario",
    entidadeId: prontuario.id,
  })

  return NextResponse.json({
    ...prontuario,
    paciente: { id: paciente.id, nome: paciente.nome },
    evolucoes,
    _count: {
      documentos: documentos.count ?? 0,
      fotos: fotos.count ?? 0,
    },
  })
}
