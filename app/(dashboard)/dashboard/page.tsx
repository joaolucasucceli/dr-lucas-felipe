"use client"

import { GitBranch, ListChecks, Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { GraficoFunil } from "@/components/features/dashboard/GraficoFunil"
import { useDashboard } from "@/hooks/use-dashboard"

export default function DashboardPage() {
  const { metricas, carregando, erro, recarregar } = useDashboard()

  if (carregando) {
    return (
      <div>
        <PageHeader
          titulo="Dashboard"
          descricao="Total de leads e funil por etapa"
        />
        <div className="mt-6">
          <SkeletonCard quantidade={2} />
        </div>
      </div>
    )
  }

  if (erro || !metricas) {
    return (
      <div>
        <PageHeader
          titulo="Dashboard"
          descricao="Total de leads e funil por etapa"
        />
        <div className="mt-6">
          <ErrorState mensagem={erro || "Erro ao carregar métricas"} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  const cardsFunil = [
    { tipo: "total" as const },
    ...metricas.leadsPorEtapa.map((etapa) => ({
      tipo: "etapa" as const,
      etapa,
    })),
  ]

  return (
    <div>
      <PageHeader
        titulo="Dashboard"
        descricao="Total de leads e funil por etapa"
      />

      <Card className="mt-6">
        <CardHeader className="gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <GitBranch className="h-4 w-4" />
              <CardTitle>Funil por Etapa</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Distribuição atual dos leads ativos no funil
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {cardsFunil.map((card, index) => {
              if (card.tipo === "total") {
                return (
                  <div
                    key="total"
                    className="rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">Total de Leads</span>
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <p className="text-3xl font-semibold leading-none">
                        {metricas.totalLeads}
                      </p>
                      <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )
              }

              const { etapa } = card
              const percentual =
                metricas.totalLeads > 0
                  ? Math.round((etapa.total / metricas.totalLeads) * 100)
                  : 0

              return (
                <div
                  key={`${etapa.etapa}-${index}`}
                  className="rounded-lg border border-border bg-background/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{etapa.label}</span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: etapa.cor }}
                    />
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-3xl font-semibold leading-none">
                      {etapa.total}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {percentual}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <GraficoFunil dados={metricas.leadsPorEtapa} />
        </CardContent>
      </Card>
    </div>
  )
}
