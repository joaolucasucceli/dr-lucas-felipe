"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
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

interface AppHeaderProps {
  nome: string
  email: string
  perfil: string
}

const perfilLabels: Record<string, string> = {
  gestor: "Gestor",
  atendente: "Atendente",
  desenvolvedor: "Desenvolvedor",
}

export function AppHeader({ nome, email, perfil }: AppHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebarTrigger perfil={perfil} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
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
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
