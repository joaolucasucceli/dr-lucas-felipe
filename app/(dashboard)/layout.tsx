import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth-helpers"
import { DashboardShell } from "@/components/features/shared/DashboardShell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <DashboardShell
      nome={session.user.name || "Usuário"}
      email={session.user.email || ""}
      perfil={session.user.perfil}
    >
      {children}
    </DashboardShell>
  )
}
