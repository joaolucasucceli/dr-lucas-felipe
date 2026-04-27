"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/features/shared/PageHeader"
import {
  BaseConhecimentoSecao,
  type BaseConhecimentoSecaoHandle,
} from "@/components/features/base-conhecimento/BaseConhecimentoSecao"
import {
  MidiaMarketingSecao,
  type MidiaMarketingSecaoHandle,
} from "@/components/features/midia-marketing/MidiaMarketingSecao"

type TabId = "base-conhecimento" | "midia-marketing"

const LABEL_NOVO: Record<TabId, string> = {
  "base-conhecimento": "Novo Texto",
  "midia-marketing": "Nova Mídia",
}

export default function ConteudoIaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const autorizado = session?.user?.perfil === "gestor"

  const [tab, setTab] = useState<TabId>("base-conhecimento")
  const baseRef = useRef<BaseConhecimentoSecaoHandle>(null)
  const midiaRef = useRef<MidiaMarketingSecaoHandle>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  if (status === "loading" || !autorizado) return null

  function handleNovo() {
    if (tab === "base-conhecimento") baseRef.current?.abrirNovo()
    else midiaRef.current?.abrirNovo()
  }

  return (
    <div>
      <PageHeader
        titulo="Conteúdo da IA"
        descricao="Material que a Ana Júlia consulta para responder pacientes no WhatsApp"
      >
        <Button onClick={handleNovo}>
          <Plus className="mr-2 h-4 w-4" />
          {LABEL_NOVO[tab]}
        </Button>
      </PageHeader>

      <div className="mt-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
          <TabsList>
            <TabsTrigger value="base-conhecimento">Conteúdo em Texto</TabsTrigger>
            <TabsTrigger value="midia-marketing">Conteúdo em Mídia</TabsTrigger>
          </TabsList>
          <TabsContent value="base-conhecimento" className="mt-6">
            <BaseConhecimentoSecao ref={baseRef} />
          </TabsContent>
          <TabsContent value="midia-marketing" className="mt-6">
            <MidiaMarketingSecao ref={midiaRef} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
