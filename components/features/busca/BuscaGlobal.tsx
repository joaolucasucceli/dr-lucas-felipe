"use client"

import { useEffect, useState } from "react"
import { User, Stethoscope } from "lucide-react"
import { formatarWhatsapp } from "@/lib/format"
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
  contatos: { id: string; nome: string; whatsapp: string; statusFunil: string }[]
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

  const temResultados =
    resultado &&
    (resultado.contatos.length > 0 || resultado.procedimentos.length > 0)

  return (
    <CommandDialog
      open={aberto}
      onOpenChange={(open) => !open && onFechar()}
      title="Busca global"
      description="Buscar contatos e procedimentos"
    >
      <Command>
      <CommandInput
        placeholder="Buscar contatos, procedimentos..."
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

        {resultado && resultado.contatos.length > 0 && (
          <CommandGroup heading="Contatos">
            {resultado.contatos.map((contato) => (
              <CommandItem
                key={contato.id}
                value={`contato-${contato.id}-${contato.nome}`}
                onSelect={() => navegar(`/contatos/${contato.id}`)}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{contato.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatarWhatsapp(contato.whatsapp)}
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
