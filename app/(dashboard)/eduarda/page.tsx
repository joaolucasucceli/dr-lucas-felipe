"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { ModuloEduarda } from "@/components/features/documentacao/modulos/ModuloEduarda"

export default function EduardaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const autorizado = session?.user?.perfil === "gestor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  if (status === "loading" || !autorizado) return null

  return (
    <div>
      <PageHeader
        titulo="Eduarda"
        descricao="Analista que lê as conversas da Ana Júlia e escreve no CRM"
      />

      <div className="mt-6">
        <ModuloEduarda />
      </div>
    </div>
  )
}
