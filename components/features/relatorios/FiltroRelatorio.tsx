"use client"

import { Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FiltroRelatorioProps {
  dataInicio: string
  dataFim: string
  onDataInicioChange: (v: string) => void
  onDataFimChange: (v: string) => void
  onGerar: () => void
  onExportar?: () => void
  carregando?: boolean
  mostrarAgrupamento?: boolean
  agrupar?: string
  onAgruparChange?: (v: string) => void
}

export function FiltroRelatorio({
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  onGerar,
  onExportar,
  carregando,
  mostrarAgrupamento,
  agrupar,
  onAgruparChange,
}: FiltroRelatorioProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1">
        <Label className="text-xs">De</Label>
        <Input
          type="date"
          value={dataInicio}
          onChange={(e) => onDataInicioChange(e.target.value)}
          className="w-36"
        />
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Até</Label>
        <Input
          type="date"
          value={dataFim}
          onChange={(e) => onDataFimChange(e.target.value)}
          className="w-36"
        />
      </div>
      {mostrarAgrupamento && onAgruparChange && (
        <div className="grid gap-1">
          <Label className="text-xs">Agrupar por</Label>
          <Select value={agrupar || "mes"} onValueChange={onAgruparChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Dia</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <Button onClick={onGerar} disabled={carregando} size="sm">
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Gerar Relatório
      </Button>
      {onExportar && (
        <Button onClick={onExportar} variant="outline" size="sm">
          <Download className="mr-2 h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      )}
    </div>
  )
}
