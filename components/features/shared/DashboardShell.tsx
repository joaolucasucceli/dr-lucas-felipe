"use client"

import { AppSidebar } from "@/components/features/shared/AppSidebar"
import { AppHeader } from "@/components/features/shared/AppHeader"

interface DashboardShellProps {
  nome: string
  email: string
  perfil: string
  children: React.ReactNode
}

export function DashboardShell({
  nome,
  email,
  perfil,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar perfil={perfil} />
      <main className="flex-1 min-w-0 overflow-hidden">
        <AppHeader nome={nome} email={email} perfil={perfil} />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
