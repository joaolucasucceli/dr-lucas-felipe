"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { PerfilAnaJulia } from "@/components/features/colaboradores/PerfilAnaJulia"

export default function EquipeIaPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  if (status === "loading") return null

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Equipe IA"
        descricao="Conheça a Ana Júlia, a assistente que cuida do atendimento da clínica"
      />

      <div className="mt-6">
        <PerfilAnaJulia />
      </div>
    </div>
  )
}
