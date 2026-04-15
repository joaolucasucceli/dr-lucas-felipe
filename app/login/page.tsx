"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { status } = useSession()
  const [erro, setErro] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard")
    }
  }, [status, router])

  if (status === "loading" || status === "authenticated") return null

  async function onSubmit(data: LoginForm) {
    setErro("")

    let _ip = "unknown"
    try {
      const ipRes = await fetch("/api/ip")
      if (ipRes.ok) {
        const ipData = await ipRes.json()
        _ip = ipData.ip || "unknown"
      }
    } catch {}

    const result = await signIn("credentials", {
      email: data.email,
      senha: data.senha,
      _ip,
      redirect: false,
    })

    if (result?.error) {
      setErro("Email ou senha inválidos")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-svh">
      {/* Esquerda — Foto do Dr. Lucas (hidden no mobile) */}
      <div className="relative hidden w-[60%] lg:block">
        <Image
          src="/images/dr-lucas/foto-1.jpeg"
          alt="Dr. Lucas Ferreira"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay escuro */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />

        {/* Branding sobre a imagem */}
        <div className="absolute bottom-12 left-12">
          <h1 className="text-3xl font-bold tracking-wide text-white">
            Dr. Lucas Ferreira
          </h1>
          <p className="mt-1 text-sm font-medium tracking-[0.2em] uppercase text-white/60">
            Estética Avançada
          </p>
          <div className="mt-4 h-px w-20 bg-white/20" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/40">
            Central de Atendimento — Gestão integrada de pacientes, agendamentos
            e procedimentos.
          </p>
        </div>
      </div>

      {/* Direita — Formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-muted p-8 lg:w-[40%]">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Central Dr. Lucas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••"
                  autoComplete="current-password"
                  className="pr-10"
                  {...register("senha")}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.senha && (
                <p className="text-xs text-destructive">{errors.senha.message}</p>
              )}
            </div>

            {erro && (
              <p className="text-center text-sm text-destructive">{erro}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Sistema interno — Acesso restrito
          </p>
        </div>
      </div>
    </div>
  )
}
