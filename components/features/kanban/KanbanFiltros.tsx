"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Usuario {
  id: string
  nome: string
}

interface Procedimento {
  id: string
  nome: string
}

interface KanbanFiltrosProps {
  responsavelId: string
  procedimentoInteresse: string
  onResponsavelChange: (valor: string) => void
  onProcedimentoChange: (valor: string) => void
}

export function KanbanFiltros({
  responsavelId,
  procedimentoInteresse,
  onResponsavelChange,
  onProcedimentoChange,
}: KanbanFiltrosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => setUsuarios(data.dados || []))
      .catch(() => {})

    fetch("/api/procedimentos")
      .then((r) => r.json())
      .then((data) => setProcedimentos(data.dados || []))
      .catch(() => {})
  }, [])

  const temFiltro = responsavelId || procedimentoInteresse

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Select
        value={responsavelId || "todos"}
        onValueChange={(v) => onResponsavelChange(v === "todos" ? "" : v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os responsáveis</SelectItem>
          {usuarios.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={procedimentoInteresse || "todos"}
        onValueChange={(v) => onProcedimentoChange(v === "todos" ? "" : v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Procedimento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os procedimentos</SelectItem>
          {procedimentos.map((p) => (
            <SelectItem key={p.id} value={p.nome}>
              {p.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {temFiltro && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onResponsavelChange("")
                onProcedimentoChange("")
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Limpar
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover todos os filtros</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
