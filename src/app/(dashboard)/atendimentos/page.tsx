"use client"

import { Suspense } from "react"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { KanbanView } from "@/components/features/kanban/KanbanView"

export default function AtendimentosPage() {
  return (
    <div className="h-full">
      <PageHeader
        titulo="Atendimentos"
        descricao="Visualize e gerencie o funil de atendimento"
      />

      <div className="mt-4">
        <Suspense>
          <KanbanView />
        </Suspense>
      </div>
    </div>
  )
}
