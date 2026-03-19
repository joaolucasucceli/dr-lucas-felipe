import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(_request: NextRequest) {
  // Autenticação será implementada na Sprint 1
  // Por enquanto, permite acesso a todas as rotas
  return NextResponse.next()
}

export const config = {
  matcher: ["/(dashboard)/:path*"],
}
