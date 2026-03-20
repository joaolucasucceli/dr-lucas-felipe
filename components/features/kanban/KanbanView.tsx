"use client"

import { useState } from "react"
import { useKanban } from "@/hooks/use-kanban"
import { KanbanBoard } from "./KanbanBoard"
import { KanbanFiltros } from "./KanbanFiltros"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"

export function KanbanView() {
  const [responsavelId, setResponsavelId] = useState("")
  const [procedimentoInteresse, setProcedimentoInteresse] = useState("")

  const { colunas, total, carregando, erro, recarregar, moverLead } = useKanban({
    responsavelId: responsavelId || undefined,
    procedimentoInteresse: procedimentoInteresse || undefined,
  })

  if (carregando) return <LoadingState />
  if (erro) return <ErrorState mensagem={erro} onTentar={recarregar} />

  return (
    <div className="mt-4">
      <KanbanFiltros
        responsavelId={responsavelId}
        procedimentoInteresse={procedimentoInteresse}
        onResponsavelChange={setResponsavelId}
        onProcedimentoChange={setProcedimentoInteresse}
      />

      <p className="mb-3 text-sm text-muted-foreground">
        {total} {total === 1 ? "lead" : "leads"} no funil
      </p>

      <KanbanBoard colunas={colunas} moverLead={moverLead} />
    </div>
  )
}
