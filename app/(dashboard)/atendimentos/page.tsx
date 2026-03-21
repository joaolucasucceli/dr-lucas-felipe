"use client"

import { PageHeader } from "@/components/features/shared/PageHeader"
import { KanbanView } from "@/components/features/kanban/KanbanView"

export default function AtendimentosPage() {
  return (
    <div>
      <PageHeader
        titulo="Atendimentos"
        descricao="Visualize e gerencie o funil de atendimento"
      />
      <KanbanView />
    </div>
  )
}
