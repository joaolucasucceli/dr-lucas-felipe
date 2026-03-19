import { prisma } from "@/lib/prisma"

interface RegistrarAuditParams {
  usuarioId?: string
  acao: string
  entidade: string
  entidadeId?: string
  dadosAntes?: unknown
  dadosDepois?: unknown
  ip?: string
}

export async function registrarAudit(params: RegistrarAuditParams) {
  return prisma.auditLog.create({
    data: {
      usuarioId: params.usuarioId,
      acao: params.acao,
      entidade: params.entidade,
      entidadeId: params.entidadeId,
      dadosAntes: params.dadosAntes as never,
      dadosDepois: params.dadosDepois as never,
      ip: params.ip,
    },
  })
}

export function getIpFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  )
}
