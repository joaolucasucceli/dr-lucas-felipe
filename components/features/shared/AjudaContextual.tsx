"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModuloDashboard } from "@/components/features/documentacao/modulos/ModuloDashboard"
import { ModuloAtendimentos } from "@/components/features/documentacao/modulos/ModuloAtendimentos"
import { ModuloContatos } from "@/components/features/documentacao/modulos/ModuloContatos"
import { ModuloProcedimentos } from "@/components/features/documentacao/modulos/ModuloProcedimentos"
import { ModuloConteudoIA } from "@/components/features/documentacao/modulos/ModuloConteudoIA"
import { ModuloConfiguracoes } from "@/components/features/documentacao/modulos/ModuloConfiguracoes"

interface EntradaAjuda {
  titulo: string
  Componente: React.ComponentType
}

// Ordem importa: prefixos mais longos primeiro (ex: /configuracoes/google-agenda antes de /configuracoes)
const MAPA_AJUDA: Array<{ prefix: string } & EntradaAjuda> = [
  { prefix: "/atendimentos", titulo: "Atendimentos", Componente: ModuloAtendimentos },
  { prefix: "/contatos", titulo: "Contatos", Componente: ModuloContatos },
  { prefix: "/procedimentos", titulo: "Procedimentos", Componente: ModuloProcedimentos },
  { prefix: "/conteudo-ia", titulo: "Conteúdo da IA", Componente: ModuloConteudoIA },
  { prefix: "/configuracoes", titulo: "Configurações", Componente: ModuloConfiguracoes },
  { prefix: "/dashboard", titulo: "Dashboard", Componente: ModuloDashboard },
]

function resolverAjuda(pathname: string): EntradaAjuda | null {
  const match = MAPA_AJUDA.find((e) => pathname.startsWith(e.prefix))
  return match ? { titulo: match.titulo, Componente: match.Componente } : null
}

export function AjudaContextual() {
  const pathname = usePathname() || ""
  const [aberto, setAberto] = useState(false)
  const ajuda = resolverAjuda(pathname)

  if (!ajuda) return null

  const { titulo, Componente } = ajuda

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAberto(true)}
            aria-label="Ajuda desta página"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ajuda desta página</TooltipContent>
      </Tooltip>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Ajuda — {titulo}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <Componente />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
