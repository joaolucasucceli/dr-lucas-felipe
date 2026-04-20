import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarAnamneseSchema } from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"
import { agora } from "@/lib/db-utils"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const parsed = atualizarAnamneseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: paciente } = await supabaseAdmin
    .from("contatos")
    .select("id, tipo")
    .eq("id", id)
    .is("deletadoEm", null)
    .maybeSingle()

  if (!paciente || paciente.tipo !== "paciente") {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  const { data: prontuario } = await supabaseAdmin
    .from("prontuarios")
    .select("id, anamnese:anamneses(*)")
    .eq("contatoId", id)
    .maybeSingle()

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  const anamneseRaw = prontuario.anamnese as unknown
  type Anamnese = {
    id: string
    pesoKg: number | null
    alturaCm: number | null
    [key: string]: unknown
  }

  let anamnese: Anamnese | null = null
  if (Array.isArray(anamneseRaw)) {
    anamnese = (anamneseRaw[0] as Anamnese | undefined) ?? null
  } else if (anamneseRaw && typeof anamneseRaw === "object") {
    anamnese = anamneseRaw as Anamnese
  }

  if (!anamnese) {
    return NextResponse.json({ error: "Anamnese não encontrada" }, { status: 404 })
  }

  const { pesoKg, alturaCm, ...resto } = parsed.data

  const dadosUpdate: Record<string, unknown> = { ...resto, atualizadoEm: agora() }

  if (pesoKg !== undefined) dadosUpdate.pesoKg = pesoKg
  if (alturaCm !== undefined) dadosUpdate.alturaCm = alturaCm

  const pesoFinal = pesoKg !== undefined ? pesoKg : anamnese.pesoKg
  const alturaFinal = alturaCm !== undefined ? alturaCm : anamnese.alturaCm

  if (pesoFinal && alturaFinal && alturaFinal > 0) {
    const alturaM = alturaFinal / 100
    const imc = pesoFinal / (alturaM * alturaM)
    dadosUpdate.imc = Math.round(imc * 100) / 100
  } else if (pesoFinal === null || alturaFinal === null) {
    dadosUpdate.imc = null
  }

  const anamneseAntes = anamnese

  const { data: anamneseAtualizada, error } = await supabaseAdmin
    .from("anamneses")
    .update(dadosUpdate)
    .eq("id", anamnese.id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "atualizar",
    entidade: "Anamnese",
    entidadeId: anamneseAtualizada.id,
    dadosAntes: anamneseAntes as unknown as Record<string, unknown>,
    dadosDepois: anamneseAtualizada as unknown as Record<string, unknown>,
  })

  return NextResponse.json(anamneseAtualizada)
}
