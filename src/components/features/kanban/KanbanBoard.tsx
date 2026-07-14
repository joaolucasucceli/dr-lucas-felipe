"use client"

import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import { KanbanColuna } from "./KanbanColuna"
import type { KanbanContato } from "@/hooks/use-kanban"
import { ETAPAS_FUNIL, FUNIL_LABELS } from "@/lib/funil"

interface KanbanBoardProps {
  colunas: Record<string, KanbanContato[]>
  moverContato: (contatoId: string, novoStatus: string) => Promise<boolean>
}

export function KanbanBoard({ colunas, moverContato }: KanbanBoardProps) {
  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const novoStatus = destination.droppableId

    moverContato(draggableId, novoStatus).then((ok) => {
      if (ok) {
        toast.success(`Lead movido para ${FUNIL_LABELS[novoStatus as keyof typeof FUNIL_LABELS] || novoStatus}`)
      }
    })
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory h-[calc(100svh-232px)]">
        {ETAPAS_FUNIL.map((etapa) => (
          <div key={etapa} className="snap-start min-w-[280px]">
            <KanbanColuna
              etapa={etapa}
              leads={colunas[etapa] || []}
            />
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
