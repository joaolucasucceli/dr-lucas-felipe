"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Pencil, Trash2, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SprintChecklist } from "./SprintChecklist"
import type { Sprint } from "@/hooks/use-sprints"

const statusConfig: Record<
  Sprint["status"],
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  planejada: { label: "Planejada", variant: "secondary" },
  em_andamento: { label: "Em andamento", variant: "default" },
  concluida: { label: "Concluída", variant: "secondary" },
}

function progressoColor(valor: number): string {
  if (valor <= 33) return "bg-red-500"
  if (valor <= 66) return "bg-yellow-500"
  return "bg-green-500"
}

function formatarData(data: string | null): string {
  if (!data) return "—"
  return new Intl.DateTimeFormat("pt-BR").format(new Date(data))
}

interface SprintCardProps {
  sprint: Sprint
  onEditar: (sprint: Sprint) => void
  onDeletar: (sprint: Sprint) => void
  onAtualizar: () => void
}

export function SprintCard({ sprint, onEditar, onDeletar, onAtualizar }: SprintCardProps) {
  const [expandido, setExpandido] = useState(false)
  const config = statusConfig[sprint.status]

  return (
    <Card
      className={`p-4 transition-colors ${
        sprint.status === "em_andamento"
          ? "border-l-4 border-l-blue-500"
          : sprint.status === "concluida"
            ? "border-l-4 border-l-green-500"
            : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{sprint.nome}</h3>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>

          {sprint.descricao && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sprint.descricao}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {(sprint.dataInicio || sprint.dataFim) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatarData(sprint.dataInicio)} — {formatarData(sprint.dataFim)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEditar(sprint)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onDeletar(sprint)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{sprint.progresso}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressoColor(sprint.progresso)}`}
            style={{ width: `${sprint.progresso}%` }}
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 h-7 text-xs"
        onClick={() => setExpandido(!expandido)}
      >
        {expandido ? (
          <>
            <ChevronUp className="mr-1 h-3 w-3" /> Recolher checklist
          </>
        ) : (
          <>
            <ChevronDown className="mr-1 h-3 w-3" /> {sprint.itens.length} itens
          </>
        )}
      </Button>

      {expandido && (
        <div className="mt-3 pt-3 border-t">
          <SprintChecklist sprintId={sprint.id} itens={sprint.itens} onAtualizar={onAtualizar} />
        </div>
      )}
    </Card>
  )
}
