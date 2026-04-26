"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileSidebarTrigger } from "@/components/features/shared/AppSidebar"
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/features/shared/ThemeToggle"
import { AjudaContextual } from "@/components/features/shared/AjudaContextual"

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
  fotoUrl?: string | null
}

export function AppHeader({ nome, email, perfil, fotoUrl }: AppHeaderProps) {
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
        <MobileSidebarTrigger perfil={perfil} nome={nome} email={email} fotoUrl={fotoUrl} />
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

        <AjudaContextual />

        <PainelNotificacoes />
      </div>

      <BuscaGlobal aberto={buscaAberta} onFechar={() => setBuscaAberta(false)} />
    </header>
  )
}
