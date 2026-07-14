import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Valida autenticação de cron jobs.
 * Aceita CRON_SECRET (padrão Vercel) ou x-api-secret (fallback dev).
 * Retorna NextResponse de erro se inválido, ou null se OK.
 */
export function validarCronSecret(request: NextRequest): NextResponse | null {
  // Vercel Cron envia Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null
  }

  // Fallback: x-api-secret (para dev e testes manuais)
  const apiSecret = request.headers.get("x-api-secret")
  if (apiSecret && apiSecret === process.env.API_SECRET) {
    return null
  }

  return NextResponse.json(
    { error: "Acesso não autorizado" },
    { status: 401 }
  )
}
