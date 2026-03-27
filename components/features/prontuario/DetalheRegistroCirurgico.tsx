"use client"

import { useState } from "react"
import { format, isPast, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Pencil, Clock, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import type { RegistroCirurgico, MarcoRecuperacao } from "@/hooks/use-prontuario"
import { FormRegistroCirurgico } from "./FormRegistroCirurgico"

const labelsAnestesia: Record<string, string> = {
  local: "Local",
  sedacao: "Sedação",
  geral: "Geral",
  raquidiana: "Raquidiana",
  peridural: "Peridural",
  bloqueio_regional: "Bloqueio Regional",
}

interface DetalheRegistroCirurgicoProps {
  registro: RegistroCirurgico
  pacienteId: string
  evolucaoId: string
  onAtualizar: () => void
}

export function DetalheRegistroCirurgico({
  registro,
  pacienteId,
  evolucaoId,
  onAtualizar,
}: DetalheRegistroCirurgicoProps) {
  const [editando, setEditando] = useState(false)

  const marcos = (registro.marcosRecuperacao || []) as MarcoRecuperacao[]

  async function toggleMarco(indice: number, concluido: boolean) {
    try {
      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/evolucoes/${evolucaoId}/registro-cirurgico/marcos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ indice, concluido }),
        }
      )
      if (!res.ok) throw new Error()
      onAtualizar()
    } catch {
      toast.error("Erro ao atualizar marco")
    }
  }

  function statusMarco(marco: MarcoRecuperacao): { label: string; cor: string } {
    if (marco.concluido) return { label: "Concluído", cor: "bg-green-100 text-green-700" }
    if (marco.dataPrevista && isPast(parseISO(marco.dataPrevista))) {
      return { label: "Atrasado", cor: "bg-red-100 text-red-700" }
    }
    return { label: "Pendente", cor: "bg-amber-100 text-amber-700" }
  }

  return (
    <>
      <div className="mt-3 pt-3 border-t bg-muted/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Registro Cirúrgico
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setEditando(true)}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Editar
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <p className="text-[10px] text-muted-foreground">Anestesia</p>
            <p className="text-xs font-medium">{labelsAnestesia[registro.tipoAnestesia] || registro.tipoAnestesia}</p>
          </div>
          {registro.anestesista && (
            <div>
              <p className="text-[10px] text-muted-foreground">Anestesista</p>
              <p className="text-xs font-medium">{registro.anestesista}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-muted-foreground">Duração</p>
            <p className="text-xs font-medium">
              <Clock className="inline h-3 w-3 mr-1" />
              {registro.tempoCircurgicoMinutos} min
            </p>
          </div>
          {registro.sangramento && (
            <div>
              <p className="text-[10px] text-muted-foreground">Sangramento</p>
              <p className="text-xs font-medium">{registro.sangramento}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Técnica</p>
            <p className="text-xs whitespace-pre-wrap">{registro.tecnicaUtilizada}</p>
          </div>
          {registro.materiaisUtilizados && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Materiais</p>
              <p className="text-xs whitespace-pre-wrap">{registro.materiaisUtilizados}</p>
            </div>
          )}
          {registro.complicacoes && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Complicações</p>
              <p className="text-xs whitespace-pre-wrap text-red-600">{registro.complicacoes}</p>
            </div>
          )}
          {registro.orientacoesPosOp && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Orientações Pós-op</p>
              <p className="text-xs whitespace-pre-wrap">{registro.orientacoesPosOp}</p>
            </div>
          )}
        </div>

        {marcos.length > 0 && (
          <>
            <Separator className="my-3" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Marcos de Recuperação
            </p>
            <div className="space-y-2">
              {marcos.map((marco, i) => {
                const { label, cor } = statusMarco(marco)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <Checkbox
                      checked={marco.concluido}
                      onCheckedChange={(v) => toggleMarco(i, !!v)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${marco.concluido ? "line-through text-muted-foreground" : ""}`}>
                        {marco.descricao}
                      </p>
                      {marco.dataPrevista && (
                        <p className="text-[10px] text-muted-foreground">
                          Previsto: {format(parseISO(marco.dataPrevista), "dd/MM/yyyy", { locale: ptBR })}
                          {marco.dataConcluida && (
                            <> — Concluído: {format(parseISO(marco.dataConcluida), "dd/MM/yyyy", { locale: ptBR })}</>
                          )}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className={`text-[10px] ${cor}`}>
                      {label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <FormRegistroCirurgico
        aberto={editando}
        onFechar={() => setEditando(false)}
        pacienteId={pacienteId}
        evolucaoId={evolucaoId}
        registro={registro}
        onSalvar={onAtualizar}
      />
    </>
  )
}
