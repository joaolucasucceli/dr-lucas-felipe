"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { useLeadsAlerta } from "@/hooks/use-leads-alerta"
import { StatusBadge } from "@/components/features/shared/StatusBadge"

function diasAtras(data: string): string {
  const diff = Date.now() - new Date(data).getTime()
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (dias === 0) return "hoje"
  if (dias === 1) return "há 1 dia"
  return `há ${dias} dias`
}

export function LeadsAlerta() {
  const router = useRouter()
  const { leads, carregando } = useLeadsAlerta()

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
        <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum lead em alerta
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
          <span className="text-xs text-muted-foreground">
            {diasAtras(lead.ultimaMovimentacaoEm || lead.atualizadoEm)}
          </span>
        </div>
      ))}
    </div>
  )
}
