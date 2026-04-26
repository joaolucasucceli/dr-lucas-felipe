"use client"

import { AppSidebar } from "@/components/features/shared/AppSidebar"
import { AppHeader } from "@/components/features/shared/AppHeader"

interface DashboardShellProps {
  perfil: string
  children: React.ReactNode
}

export function DashboardShell({ perfil, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar perfil={perfil} />
      <main className="flex-1 min-w-0 overflow-hidden">
        <AppHeader perfil={perfil} />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
