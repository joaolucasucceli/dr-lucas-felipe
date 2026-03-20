import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, registrarTentativa, resetarTentativas } from "@/lib/rate-limit"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
        _ip: { label: "IP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          return null
        }

        const ip = credentials._ip || "unknown"

        try {
          const { bloqueado } = await checkRateLimit(ip)
          if (bloqueado) {
            return null
          }
        } catch {
          // Se o Redis falhar, não bloquear o login
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
        })

        if (!usuario || !usuario.ativo || usuario.deletadoEm) {
          try { await registrarTentativa(ip) } catch {}
          return null
        }

        const senhaValida = await compare(credentials.senha, usuario.senha)

        if (!senhaValida) {
          try { await registrarTentativa(ip) } catch {}
          return null
        }

        try { await resetarTentativas(ip) } catch {}

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          tipo: usuario.tipo,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.perfil = user.perfil
        token.tipo = user.tipo
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.perfil = token.perfil
        session.user.tipo = token.tipo
      }
      return session
    },
  },
}
