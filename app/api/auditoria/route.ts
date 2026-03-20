import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAnyRole } from "@/lib/auth-helpers"

export async function GET(req: NextRequest) {
  const auth = await requireAnyRole(["gestor", "desenvolvedor"])
  if (auth.error) return auth.error

  const { searchParams } = req.nextUrl
  const usuarioId = searchParams.get("usuarioId") || undefined
  const entidade = searchParams.get("entidade") || undefined
  const acao = searchParams.get("acao") || undefined
  const dataInicio = searchParams.get("dataInicio") || undefined
  const dataFim = searchParams.get("dataFim") || undefined
  const pagina = Math.max(1, Number(searchParams.get("pagina") || "1"))
  const porPagina = Math.min(100, Math.max(1, Number(searchParams.get("porPagina") || "20")))

  const where = {
    ...(usuarioId && { usuarioId }),
    ...(entidade && { entidade }),
    ...(acao && { acao }),
    ...(dataInicio || dataFim
      ? {
          criadoEm: {
            ...(dataInicio && { gte: new Date(dataInicio) }),
            ...(dataFim && { lte: new Date(dataFim) }),
          },
        }
      : {}),
  }

  const [total, dados] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        usuario: { select: { nome: true, email: true } },
      },
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])

  return NextResponse.json({
    dados,
    total,
    pagina,
    totalPaginas: Math.ceil(total / porPagina),
  })
}
