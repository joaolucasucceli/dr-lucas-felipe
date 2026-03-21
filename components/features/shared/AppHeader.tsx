"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { LogOut, Search, User, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/features/shared/UserAvatar"
import { MobileSidebarTrigger } from "@/components/features/shared/AppSidebar"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/features/shared/ThemeToggle"

const BuscaGlobal = dynamic(
  () => import("@/components/features/busca/BuscaGlobal").then((m) => m.BuscaGlobal),
  { ssr: false }
)

const PainelNotificacoes = dynamic(
  () =>
    import("@/components/features/notificacoes/PainelNotificacoes").then(
      (m) => m.PainelNotificacoes
    ),
  { ssr: false }
)

interface AppHeaderProps {
  nome: string
  email: string
  perfil: string
}

const perfilLabels: Record<string, string> = {
  gestor: "Gestor",
  atendente: "Atendente",
}

export function AppHeader({ nome, email, perfil }: AppHeaderProps) {
  const router = useRouter()
  const [buscaAberta, setBuscaAberta] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setBuscaAberta(true)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebarTrigger perfil={perfil} />
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setBuscaAberta(true)}
          aria-label="Abrir busca"
        >
          <Search className="h-4 w-4" />
          <span className="hidden text-xs sm:inline-block">
            Buscar
          </span>
          <kbd className="hidden rounded border bg-muted px-1.5 text-xs sm:inline-block">
            Ctrl K
          </kbd>
        </Button>

        <PainelNotificacoes />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2" aria-label={nome}>
              <UserAvatar nome={nome} tamanho="sm" />
              <span className="hidden text-sm font-medium sm:inline-block">
                {nome}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{nome}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <Badge variant="secondary" className="mt-1">
                {perfilLabels[perfil] || perfil}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/meu-perfil")}>
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            {perfil === "gestor" && (
              <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <BuscaGlobal aberto={buscaAberta} onFechar={() => setBuscaAberta(false)} />
    </header>
  )
}
