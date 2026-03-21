"use client"

import { useRouter } from "next/navigation"
import { Clock, Bell, DoorOpen, MessageSquare } from "lucide-react"
import { useLeadsFollowUpAtivos } from "@/hooks/use-leads-followup-ativos"
import { StatusBadge } from "@/components/features/shared/StatusBadge"

function UltimoFollowUp({ followUpEnviados }: { followUpEnviados: string[] }) {
  if (followUpEnviados.includes("24h")) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
        <DoorOpen className="h-3 w-3" />
        24h enviado
      </span>
    )
  }
  if (followUpEnviados.includes("6h")) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
        <Bell className="h-3 w-3" />
        6h enviado
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-yellow-600 dark:text-yellow-500">
      <Clock className="h-3 w-3" />
      1h enviado
    </span>
  )
}

export function LeadsFollowUpAtivos() {
  const router = useRouter()
  const { leads, carregando } = useLeadsFollowUpAtivos()

  if (carregando) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum follow-up aguardando resposta
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
          onClick={() => router.push(`/leads/${lead.id}`)}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{lead.nome}</span>
            <StatusBadge status={lead.statusFunil} variante="funil" />
          </div>
          <UltimoFollowUp followUpEnviados={lead.followUpEnviados} />
        </div>
      ))}
    </div>
  )
}
