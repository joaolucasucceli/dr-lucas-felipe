"use client"

import { useState } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import { KanbanColuna } from "./KanbanColuna"
import { ModalMotivoPerdido } from "./ModalMotivoPerdido"
import type { KanbanLead } from "@/hooks/use-kanban"

const ETAPA_LABELS: Record<string, string> = {
  acolhimento: "Acolhimento",
  qualificacao: "Qualificação",
  agendamento: "Agendamento",
  consulta_agendada: "Consulta Agendada",
  consulta_realizada: "Consulta Realizada",
  sinal_pago: "Sinal Pago",
  procedimento_agendado: "Procedimento Agendado",
  concluido: "Concluído",
  perdido: "Perdido",
}

const ETAPAS_FUNIL = [
  "acolhimento",
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

    moverLead(draggableId, novoStatus).then((ok) => {
      if (ok) toast.success(`Lead movido para ${ETAPA_LABELS[novoStatus] || novoStatus}`)
    })
  }

  async function handleConfirmarPerdido(motivo: string) {
    if (!modalPerdido) return
    const ok = await moverLead(modalPerdido.leadId, "perdido", motivo)
    if (ok) toast.success("Lead marcado como Perdido")
    setModalPerdido(null)
  }

  return (
    <>
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

      <ModalMotivoPerdido
        aberto={!!modalPerdido}
        onFechar={() => setModalPerdido(null)}
        onConfirmar={handleConfirmarPerdido}
        nomeLead={modalPerdido?.nomeLead || ""}
      />
    </>
  )
}
