import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      perfil: string
      tipo: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    perfil: string
    tipo: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    perfil: string
    tipo: string
  }
}
