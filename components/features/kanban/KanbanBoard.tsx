"use client"

import { useState } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { KanbanColuna } from "./KanbanColuna"
import { ModalMotivoPerdido } from "./ModalMotivoPerdido"
import type { KanbanLead } from "@/hooks/use-kanban"

const ETAPAS_FUNIL = [
  "primeiro_atendimento",
  "qualificacao",
  "agendamento",
  "consulta_agendada",
  "consulta_realizada",
  "sinal_pago",
  "procedimento_agendado",
  "concluido",
  "perdido",
]

interface KanbanBoardProps {
  colunas: Record<string, KanbanLead[]>
  moverLead: (leadId: string, novoStatus: string, motivoPerda?: string) => Promise<boolean>
}

export function KanbanBoard({ colunas, moverLead }: KanbanBoardProps) {
  const [modalPerdido, setModalPerdido] = useState<{
    leadId: string
    nomeLead: string
  } | null>(null)

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

    // Se destino é "perdido", abrir modal de motivo
    if (novoStatus === "perdido") {
      const lead = colunas[source.droppableId]?.find((l) => l.id === draggableId)
      setModalPerdido({
        leadId: draggableId,
        nomeLead: lead?.nome || "",
      })
      return
    }

    moverLead(draggableId, novoStatus)
  }

  async function handleConfirmarPerdido(motivo: string) {
    if (!modalPerdido) return
    await moverLead(modalPerdido.leadId, "perdido", motivo)
    setModalPerdido(null)
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollSnapType: "x mandatory" }}>
          {ETAPAS_FUNIL.map((etapa) => (
            <div key={etapa} style={{ scrollSnapAlign: "start" }}>
              <KanbanColuna
                etapa={etapa}
                leads={colunas[etapa] || []}
              />
            </div>
          ))}
        </div>
      </DragDropContext>

      <ModalMotivoPerdido
        aberto={!!modalPerdido}
        onFechar={() => setModalPerdido(null)}
        onConfirmar={handleConfirmarPerdido}
        nomeLead={modalPerdido?.nomeLead || ""}
      />
    </>
  )
}
