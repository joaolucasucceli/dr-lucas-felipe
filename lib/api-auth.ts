import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Valida header x-api-secret para rotas internas do agente.
 * Retorna NextResponse de erro se inválido, ou null se OK.
 */
export function validarApiSecret(request: NextRequest): NextResponse | null {
  const secret = request.headers.get("x-api-secret")

  if (!secret || secret !== process.env.API_SECRET) {
    return NextResponse.json(
      { error: "Acesso não autorizado" },
      { status: 401 }
    )
  }

  return null
}
