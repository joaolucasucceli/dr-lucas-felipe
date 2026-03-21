"use client"

import { useRouter } from "next/navigation"
import { Draggable } from "@hello-pangea/dnd"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertTriangle, Clock, Bell, DoorOpen, Repeat2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/features/shared/UserAvatar"
import type { KanbanLead } from "@/hooks/use-kanban"

interface KanbanCardProps {
  lead: KanbanLead
  index: number
}

function FollowUpBadge({ followUpEnviados }: { followUpEnviados: string[] }) {
  if (followUpEnviados.includes("24h")) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-0.5 shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <DoorOpen className="h-3 w-3" />
            24h
          </span>
        </TooltipTrigger>
        <TooltipContent>Follow-up de 24h enviado — 3ª e última tentativa</TooltipContent>
      </Tooltip>
    )
  }
  if (followUpEnviados.includes("6h")) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-0.5 shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            <Bell className="h-3 w-3" />
            6h
          </span>
        </TooltipTrigger>
        <TooltipContent>Follow-up de 6h enviado — 2ª tentativa de contato</TooltipContent>
      </Tooltip>
    )
  }
  if (followUpEnviados.includes("1h")) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-0.5 shrink-0 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600">
            <Clock className="h-3 w-3" />
            1h
          </span>
        </TooltipTrigger>
        <TooltipContent>Follow-up de 1h enviado — 1ª tentativa de contato</TooltipContent>
      </Tooltip>
    )
  }
  return null
}

export function KanbanCard({ lead, index }: KanbanCardProps) {
  const router = useRouter()

  const dataMovimentacao = new Date(lead.ultimaMovimentacaoEm || lead.atualizadoEm)
  const tempo = formatDistanceToNow(dataMovimentacao, { locale: ptBR, addSuffix: true })
  const dataExata = format(dataMovimentacao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

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
            <div className="flex items-center gap-1 shrink-0">
              {lead.ehRetorno && (
                <span className="flex items-center gap-0.5 shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" title={`Ciclo ${lead.cicloAtual}`}>
                  <Repeat2 className="h-3 w-3" />
                  {lead.cicloAtual}º
                </span>
              )}
              <FollowUpBadge followUpEnviados={lead.followUpEnviados} />
              {lead.diasNaEtapa > 3 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      {lead.diasNaEtapa}d
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{lead.diasNaEtapa} dias parado nesta etapa — requer atenção</TooltipContent>
                </Tooltip>
              )}
            </div>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground cursor-default">{tempo}</span>
              </TooltipTrigger>
              <TooltipContent>Última movimentação: {dataExata}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </Draggable>
  )
}
