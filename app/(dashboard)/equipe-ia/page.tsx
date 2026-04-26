"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { PerfilAnaJulia } from "@/components/features/colaboradores/PerfilAnaJulia"
import { PerfilEduarda } from "@/components/features/colaboradores/PerfilEduarda"

export default function EquipeIaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const ehGestor = session?.user?.perfil === "gestor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  if (status === "loading") return null

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Equipe IA"
        descricao="Conheça os agentes que trabalham com você no atendimento da clínica"
      />

      <div className="mt-6">
        <Tabs defaultValue="ana-julia">
          <TabsList>
            <TabsTrigger value="ana-julia">Ana Júlia</TabsTrigger>
            {ehGestor && <TabsTrigger value="eduarda">Eduarda</TabsTrigger>}
          </TabsList>
          <TabsContent value="ana-julia" className="mt-6">
            <PerfilAnaJulia />
          </TabsContent>
          {ehGestor && (
            <TabsContent value="eduarda" className="mt-6">
              <PerfilEduarda />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
