import { supabaseAdmin } from "@/lib/supabase"
import { criarId } from "@/lib/db-utils"

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
    const insertData = {
      id: criarId(),
      usuarioId,
      acao,
      entidade,
      entidadeId: entidadeId ?? null,
      dadosAntes: (dadosAntes ?? null) as never,
      dadosDepois: (dadosDepois ?? null) as never,
      ip: ip ?? null,
    }
    await supabaseAdmin.from("audit_logs").insert(insertData)
  } catch {
    console.error("[AuditLog] Erro ao registrar:", { acao, entidade, entidadeId })
  }
}
