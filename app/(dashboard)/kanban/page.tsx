"use client"

import { PageHeader } from "@/components/features/shared/PageHeader"
import { KanbanView } from "@/components/features/kanban/KanbanView"

export default function KanbanPage() {
  return (
    <div>
      <PageHeader
        titulo="Kanban"
        descricao="Visualize e gerencie o funil de atendimento"
      />
      <KanbanView />
    </div>
  )
}
