"use client"

import { useRouter } from "next/navigation"
import { Draggable } from "@hello-pangea/dnd"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertTriangle } from "lucide-react"
import { UserAvatar } from "@/components/features/shared/UserAvatar"
import type { KanbanLead } from "@/hooks/use-kanban"

interface KanbanCardProps {
  lead: KanbanLead
  index: number
}

export function KanbanCard({ lead, index }: KanbanCardProps) {
  const router = useRouter()

  const tempo = formatDistanceToNow(
    new Date(lead.ultimaMovimentacaoEm || lead.atualizadoEm),
    { locale: ptBR, addSuffix: true }
  )

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => router.push(`/leads/${lead.id}`)}
          className={`rounded-lg border bg-card p-3 cursor-pointer transition-shadow ${
            snapshot.isDragging ? "shadow-lg opacity-90" : "hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight truncate">
              {lead.nome}
            </p>
            {lead.diasNaEtapa > 3 && (
              <span className="flex items-center gap-0.5 shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" />
                {lead.diasNaEtapa}d
              </span>
            )}
          </div>

          {lead.procedimentoInteresse && (
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {lead.procedimentoInteresse}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {lead.responsavel ? (
                <>
                  <UserAvatar nome={lead.responsavel.nome} tamanho="sm" />
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {lead.responsavel.nome}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Sem responsável
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{tempo}</span>
          </div>
        </div>
      )}
    </Draggable>
  )
}
