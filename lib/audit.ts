import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

interface AuditLogParams {
  usuarioId: string
  acao: string
  entidade: string
  entidadeId?: string
  dadosAntes?: Record<string, unknown>
  dadosDepois?: Record<string, unknown>
  ip?: string
}

export async function registrarAuditLog({
  usuarioId,
  acao,
  entidade,
  entidadeId,
  dadosAntes,
  dadosDepois,
  ip,
}: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId,
        acao,
        entidade,
        entidadeId: entidadeId ?? null,
        dadosAntes: dadosAntes ? (dadosAntes as Prisma.InputJsonValue) : undefined,
        dadosDepois: dadosDepois ? (dadosDepois as Prisma.InputJsonValue) : undefined,
        ip: ip ?? null,
      },
    })
  } catch {
    // Falha no audit log não deve bloquear a operação principal
    console.error("[AuditLog] Erro ao registrar:", { acao, entidade, entidadeId })
  }
}
