import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { registrarAuditLog } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { id } = await params

  const paciente = await prisma.paciente.findUnique({
    where: { id, deletadoEm: null },
    select: {
      id: true,
      nome: true,
      prontuario: {
        include: {
          anamnese: true,
          evolucoes: {
            where: { deletadoEm: null },
            orderBy: { dataRegistro: "desc" },
            include: {
              procedimento: {
                select: { id: true, nome: true },
              },
              registroCirurgico: true,
            },
          },
          _count: {
            select: {
              documentos: true,
              fotos: true,
            },
          },
        },
      },
    },
  })

  if (!paciente) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
  }

  if (!paciente.prontuario) {
    return NextResponse.json({ error: "Prontuário não encontrado" }, { status: 404 })
  }

  await registrarAuditLog({
    usuarioId: auth.session.user.id,
    acao: "visualizar",
    entidade: "Prontuario",
    entidadeId: paciente.prontuario.id,
  })

  return NextResponse.json(paciente.prontuario)
}
