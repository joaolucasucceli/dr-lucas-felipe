"use client"

import { MobileSidebarTrigger } from "@/components/features/shared/AppSidebar"
import { AjudaContextual } from "@/components/features/shared/AjudaContextual"

interface AppHeaderProps {
  perfil: string
}

export function AppHeader({ perfil }: AppHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebarTrigger perfil={perfil} />
      </div>

      <div className="flex items-center gap-1">
        <AjudaContextual />
      </div>
    </header>
  )
}
