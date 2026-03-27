"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Plus, Trash2, Activity } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { FormSinalVital } from "./FormSinalVital"
import { avaliarSinalVital, labelsTipo, obterUnidade } from "@/lib/sinais-vitais/limiares"

interface SinalVital {
  id: string
  tipo: string
  valor: string
  unidade: string
  dataRegistro: string
  observacao: string | null
}

const coresAlerta: Record<string, string> = {
  normal: "bg-green-100 text-green-700",
  atencao: "bg-amber-100 text-amber-700",
  critico: "bg-red-100 text-red-700",
}

const labelsAlerta: Record<string, string> = {
  normal: "Normal",
  atencao: "Atenção",
  critico: "Crítico",
}

const tiposFiltro = [
  { value: "todos", label: "Todos" },
  { value: "pressao_arterial", label: "Pressão Arterial" },
  { value: "frequencia_cardiaca", label: "Freq. Cardíaca" },
  { value: "temperatura", label: "Temperatura" },
  { value: "saturacao_o2", label: "SpO₂" },
  { value: "glicemia", label: "Glicemia" },
]

interface SinaisVitaisProps {
  pacienteId: string
}

export function SinaisVitais({ pacienteId }: SinaisVitaisProps) {
  const [sinais, setSinais] = useState<SinalVital[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [formAberto, setFormAberto] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = filtroTipo !== "todos" ? `?tipo=${filtroTipo}` : ""
      const res = await fetch(`/api/pacientes/${pacienteId}/prontuario/sinais-vitais${params}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSinais(json.dados)
    } catch {
      toast.error("Erro ao carregar sinais vitais")
    } finally {
      setCarregando(false)
    }
  }, [pacienteId, filtroTipo])

  useEffect(() => {
    buscar()
  }, [buscar])

  async function handleExcluir(sinalId: string) {
    try {
      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/sinais-vitais/${sinalId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error()
      toast.success("Registro removido")
      buscar()
    } catch {
      toast.error("Erro ao remover registro")
    } finally {
      setConfirmExcluir(null)
    }
  }

  // Últimos valores por tipo
  const ultimosPorTipo = Object.keys(labelsTipo).reduce<Record<string, SinalVital | null>>(
    (acc, tipo) => {
      acc[tipo] = sinais.find((s) => s.tipo === tipo) || null
      return acc
    },
    {}
  )

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Sinais Vitais</CardTitle>
          </div>
          <Button size="sm" onClick={() => setFormAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar
          </Button>
        </CardHeader>
        <CardContent>
          {/* Dashboard de últimos valores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {Object.entries(labelsTipo).map(([tipo, label]) => {
              const ultimo = ultimosPorTipo[tipo]
              const nivel = ultimo ? avaliarSinalVital(tipo, ultimo.valor) : null

              return (
                <div
                  key={tipo}
                  className="rounded-lg border p-3 text-center"
                >
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">{label}</p>
                  {ultimo ? (
                    <>
                      <p className="text-lg font-semibold">
                        {ultimo.valor}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {obterUnidade(tipo)}
                        </span>
                      </p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] mt-1 ${coresAlerta[nivel!]}`}
                      >
                        {labelsAlerta[nivel!]}
                      </Badge>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Filtro + Tabela histórica */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Histórico</p>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposFiltro.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {carregando ? (
            <p className="text-center text-muted-foreground py-6">Carregando...</p>
          ) : sinais.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Nenhum sinal vital registrado.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sinais.map((sinal) => {
                    const nivel = avaliarSinalVital(sinal.tipo, sinal.valor)
                    return (
                      <TableRow key={sinal.id}>
                        <TableCell className="text-xs font-medium">
                          {labelsTipo[sinal.tipo] || sinal.tipo}
                        </TableCell>
                        <TableCell className="text-xs">
                          {sinal.valor} {sinal.unidade}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${coresAlerta[nivel]}`}
                          >
                            {labelsAlerta[nivel]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(sinal.dataRegistro), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setConfirmExcluir(sinal.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FormSinalVital
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        pacienteId={pacienteId}
        onSalvar={buscar}
      />

      <ConfirmDialog
        aberto={!!confirmExcluir}
        onFechar={() => setConfirmExcluir(null)}
        onConfirmar={() => confirmExcluir && handleExcluir(confirmExcluir)}
        titulo="Excluir Registro"
        descricao="Tem certeza que deseja excluir este registro de sinal vital?"
        textoBotao="Excluir"
        variante="destrutivo"
      />
    </>
  )
}
