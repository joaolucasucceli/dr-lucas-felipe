"use client"

import { useEffect, useState } from "react"
import { User, Calendar, Stethoscope } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface ResultadoBusca {
  leads: { id: string; nome: string; whatsapp: string; statusFunil: string }[]
  agendamentos: {
    id: string
    dataHora: string
    status: string
    lead: { nome: string }
    procedimento: { nome: string } | null
  }[]
  procedimentos: { id: string; nome: string; ativo: boolean }[]
  total: number
}

interface BuscaGlobalProps {
  aberto: boolean
  onFechar: () => void
}

export function BuscaGlobal({ aberto, onFechar }: BuscaGlobalProps) {
  const [termo, setTermo] = useState("")
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!aberto) {
      setTermo("")
      setResultado(null)
      return
    }
  }, [aberto])

  useEffect(() => {
    if (termo.length < 2) {
      setResultado(null)
      return
    }

    setCarregando(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(termo)}`)
        if (res.ok) {
          const data = await res.json()
          setResultado(data)
        }
      } finally {
        setCarregando(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [termo])

  function navegar(href: string) {
    onFechar()
    window.location.href = href
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const temResultados =
    resultado &&
    (resultado.leads.length > 0 ||
      resultado.agendamentos.length > 0 ||
      resultado.procedimentos.length > 0)

  return (
    <CommandDialog
      open={aberto}
      onOpenChange={(open) => !open && onFechar()}
      title="Busca global"
      description="Buscar leads, agendamentos e procedimentos"
    >
      <Command>
      <CommandInput
        placeholder="Buscar leads, agendamentos..."
        value={termo}
        onValueChange={setTermo}
      />
      <CommandList>
        {carregando && <CommandEmpty>Buscando...</CommandEmpty>}
        {!carregando && termo.length >= 2 && !temResultados && (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        )}
        {!carregando && termo.length < 2 && (
          <CommandEmpty>Digite ao menos 2 caracteres para buscar.</CommandEmpty>
        )}

        {resultado && resultado.leads.length > 0 && (
          <CommandGroup heading="Leads">
            {resultado.leads.map((lead) => (
              <CommandItem
                key={lead.id}
                value={`lead-${lead.id}-${lead.nome}`}
                onSelect={() => navegar(`/leads/${lead.id}`)}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{lead.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {lead.whatsapp}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {resultado && resultado.agendamentos.length > 0 && (
          <CommandGroup heading="Agendamentos">
            {resultado.agendamentos.map((ag) => (
              <CommandItem
                key={ag.id}
                value={`agendamento-${ag.id}-${ag.lead.nome}`}
                onSelect={() => navegar("/agendamentos")}
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{ag.lead.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatarData(ag.dataHora)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {resultado && resultado.procedimentos.length > 0 && (
          <CommandGroup heading="Procedimentos">
            {resultado.procedimentos.map((proc) => (
              <CommandItem
                key={proc.id}
                value={`procedimento-${proc.id}-${proc.nome}`}
                onSelect={() => navegar(`/procedimentos/${proc.id}`)}
              >
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span>{proc.nome}</span>
                {!proc.ativo && (
                  <span className="ml-auto text-xs text-muted-foreground">Inativo</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      </Command>
    </CommandDialog>
  )
}
