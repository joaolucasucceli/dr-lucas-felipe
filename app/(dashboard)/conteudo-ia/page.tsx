"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { BaseConhecimentoSecao } from "@/components/features/base-conhecimento/BaseConhecimentoSecao"
import { MidiaMarketingSecao } from "@/components/features/midia-marketing/MidiaMarketingSecao"

export default function ConteudoIaPage() {
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
        titulo="Conteúdo da IA"
        descricao="Material que a Ana Júlia consulta para responder pacientes no WhatsApp"
      />

      <div className="mt-6">
        <Tabs defaultValue="base-conhecimento">
          <TabsList>
            <TabsTrigger value="base-conhecimento">Base de Conhecimento</TabsTrigger>
            <TabsTrigger value="midia-marketing">Mídia Marketing</TabsTrigger>
          </TabsList>
          <TabsContent value="base-conhecimento" className="mt-6">
            <BaseConhecimentoSecao />
          </TabsContent>
          <TabsContent value="midia-marketing" className="mt-6">
            <MidiaMarketingSecao />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
