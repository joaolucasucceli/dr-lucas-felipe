import { getServerSession, type Session } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import type { Perfil } from "@/generated/prisma/client"

type AuthSuccess = { session: Session; error: null }
type AuthError = { session: null; error: NextResponse }
type AuthResult = AuthSuccess | AuthError

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

export async function requireAuth(): Promise<AuthResult> {
  const session = await getSession()

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    }
  }

  return { session, error: null }
}

export async function requireRole(perfil: Perfil): Promise<AuthResult> {
  const result = await requireAuth()
  if (result.error) return result

  if (result.session.user.perfil !== perfil) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    }
  }

  return result
}

export async function requireAnyRole(perfis: Perfil[]): Promise<AuthResult> {
  const result = await requireAuth()
  if (result.error) return result

  if (!perfis.includes(result.session.user.perfil as Perfil)) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    }
  }

  return result
}
