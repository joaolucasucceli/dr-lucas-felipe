"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const { leads, total, carregando } = useLeadsAlerta()

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
        <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          Tudo certo!
        </p>
        <p className="text-xs text-muted-foreground">
          Nenhum lead sem movimentação
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-2">Sem movimentação há 3+ dias</p>
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
      {total > 5 && (
        <Button variant="ghost" size="sm" className="w-full mt-1" asChild>
          <Link href="/leads?filtro=alerta">Ver todos ({total})</Link>
        </Button>
      )}
    </div>
  )
}
