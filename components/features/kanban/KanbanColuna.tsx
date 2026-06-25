"use client"

import { Droppable } from "@hello-pangea/dnd"
import { Users } from "lucide-react"
import { KanbanCard } from "./KanbanCard"
import type { KanbanContato } from "@/hooks/use-kanban"
import { FUNIL_LABELS } from "@/lib/funil"

const coresColuna: Record<string, { bg: string; text: string; border: string }> = {
  acolhimento: { bg: "bg-zinc-100", text: "text-zinc-800", border: "border-zinc-300" },
  qualificacao: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-300" },
  orcamento: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300" },
  agendamento: { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-300" },
  consulta_agendada: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-300" },
  atendimento_humano: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-300" },
}

interface KanbanColunaProps {
  etapa: string
  leads: KanbanContato[]
}

export function KanbanColuna({ etapa, leads }: KanbanColunaProps) {
  const cores = coresColuna[etapa] || coresColuna.acolhimento
  const label = FUNIL_LABELS[etapa as keyof typeof FUNIL_LABELS] || etapa

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg border bg-muted/30">
      <div
        className={`flex items-center justify-between rounded-t-lg border-b-2 ${cores.border} ${cores.bg} px-3 py-2`}
      >
        <h3 className={`text-xs font-semibold ${cores.text}`}>{label}</h3>
        <span
          className={`flex h-5 min-w-5 items-center justify-center gap-1 rounded-full ${cores.bg} ${cores.text} px-1.5 text-[10px] font-bold`}
        >
          <Users className="h-3 w-3" />
          {leads.length}
        </span>
      </div>

      <Droppable droppableId={etapa}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-1 flex-col gap-2 p-2 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? "bg-muted/60" : ""
            }`}
          >
            {leads.map((lead, index) => (
              <KanbanCard key={lead.id} lead={lead} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
