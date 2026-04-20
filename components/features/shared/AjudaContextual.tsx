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
import { ModuloLeads } from "@/components/features/documentacao/modulos/ModuloLeads"
import { ModuloPacientes } from "@/components/features/documentacao/modulos/ModuloPacientes"
import { ModuloProcedimentos } from "@/components/features/documentacao/modulos/ModuloProcedimentos"
import { ModuloBaseConhecimento } from "@/components/features/documentacao/modulos/ModuloBaseConhecimento"
import { ModuloMidiaMarketing } from "@/components/features/documentacao/modulos/ModuloMidiaMarketing"
import { ModuloMeuPerfil } from "@/components/features/documentacao/modulos/ModuloMeuPerfil"
import { ModuloConfiguracoes } from "@/components/features/documentacao/modulos/ModuloConfiguracoes"
import { ModuloAnaJulia } from "@/components/features/documentacao/modulos/ModuloAnaJulia"
import { ModuloEduarda } from "@/components/features/documentacao/modulos/ModuloEduarda"

interface EntradaAjuda {
  titulo: string
  Componente: React.ComponentType
}

// Ordem importa: prefixos mais longos primeiro (ex: /configuracoes/google-agenda antes de /configuracoes)
const MAPA_AJUDA: Array<{ prefix: string } & EntradaAjuda> = [
  { prefix: "/ana-julia", titulo: "Ana Júlia", Componente: ModuloAnaJulia },
  { prefix: "/eduarda", titulo: "Eduarda", Componente: ModuloEduarda },
  { prefix: "/atendimentos", titulo: "Atendimentos", Componente: ModuloAtendimentos },
  { prefix: "/leads", titulo: "Leads", Componente: ModuloLeads },
  { prefix: "/pacientes", titulo: "Pacientes", Componente: ModuloPacientes },
  { prefix: "/procedimentos", titulo: "Procedimentos", Componente: ModuloProcedimentos },
  { prefix: "/base-conhecimento", titulo: "Base de Conhecimento", Componente: ModuloBaseConhecimento },
  { prefix: "/midia-marketing", titulo: "Mídia Marketing", Componente: ModuloMidiaMarketing },
  { prefix: "/meu-perfil", titulo: "Meu Perfil", Componente: ModuloMeuPerfil },
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
        <DialogContent className="max-w-5xl">
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
