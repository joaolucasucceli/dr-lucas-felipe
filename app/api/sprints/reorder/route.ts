import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"
import { registrarAudit, getIpFromHeaders } from "@/lib/audit"
import { reordenarSprintsSchema } from "@/lib/validations/sprint"

export async function PATCH(request: NextRequest) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = reordenarSprintsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await prisma.$transaction(
    parsed.data.itens.map(({ id, ordem }) =>
      prisma.sprint.update({
        where: { id },
        data: { ordem },
      })
    )
  )

  await registrarAudit({
    usuarioId: auth.session.user.id,
    acao: "reorder",
    entidade: "Sprint",
    dadosDepois: { itens: parsed.data.itens },
    ip: getIpFromHeaders(request.headers),
  })

  return NextResponse.json({ mensagem: "Sprints reordenadas" })
}
