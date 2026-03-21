"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TabItem {
  valor: string
  titulo: string
  icone: React.ReactNode
  conteudo: React.ReactNode
}

interface TabsDocumentacaoProps {
  abas: TabItem[]
}

export function TabsDocumentacao({ abas }: TabsDocumentacaoProps) {
  return (
    <Tabs defaultValue={abas[0].valor} className="mt-6">
      <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
        {abas.map((aba) => (
          <TabsTrigger
            key={aba.valor}
            value={aba.valor}
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{aba.icone}</span>
            <span className="hidden sm:inline">{aba.titulo}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {abas.map((aba) => (
        <TabsContent key={aba.valor} value={aba.valor} className="mt-6">
          {aba.conteudo}
        </TabsContent>
      ))}
    </Tabs>
  )
}
