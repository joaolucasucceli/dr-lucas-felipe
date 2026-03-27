import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { atualizarAnamneseSchema } from "@/lib/validations/prontuario"
import { registrarAuditLog } from "@/lib/audit"

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

  const prontuario = await prisma.prontuario.findFirst({
    where: { paciente: { id, deletadoEm: null } },
    include: { anamnese: true },
  })

  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  if (!prontuario.anamnese) {
    return NextResponse.json({ error: "Anamnese não encontrada" }, { status: 404 })
  }

  const { pesoKg, alturaCm, ...resto } = parsed.data

  const dadosUpdate: Record<string, unknown> = { ...resto }

  if (pesoKg !== undefined) {
    dadosUpdate.pesoKg = pesoKg
  }
  if (alturaCm !== undefined) {
    dadosUpdate.alturaCm = alturaCm
  }

  // Calcular IMC automaticamente se peso e altura estão presentes
  const pesoFinal = pesoKg !== undefined ? pesoKg : prontuario.anamnese.pesoKg?.toNumber() ?? null
  const alturaFinal = alturaCm !== undefined ? alturaCm : prontuario.anamnese.alturaCm?.toNumber() ?? null

  if (pesoFinal && alturaFinal && alturaFinal > 0) {
    const alturaM = alturaFinal / 100
    const imc = pesoFinal / (alturaM * alturaM)
    dadosUpdate.imc = (Math.round(imc * 100) / 100)
  } else if (pesoFinal === null || alturaFinal === null) {
    dadosUpdate.imc = null
  }

  const anamneseAntes = prontuario.anamnese

  const anamneseAtualizada = await prisma.anamnese.update({
    where: { id: prontuario.anamnese.id },
    data: dadosUpdate,
  })

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
