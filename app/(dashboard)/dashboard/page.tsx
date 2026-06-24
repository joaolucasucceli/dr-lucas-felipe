"use client"

import { GitBranch, Users } from "lucide-react"
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

  return (
    <div>
      <PageHeader
        titulo="Dashboard"
        descricao="Total de leads e funil por etapa"
      />

      <Card className="mt-6">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                <CardTitle>Funil por Etapa</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Distribuição atual dos leads ativos no funil
              </CardDescription>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 lg:min-w-64">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Total de Leads</span>
              </div>
              <p className="mt-2 text-4xl font-semibold leading-none">
                {metricas.totalLeads}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Leads ativos no funil
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metricas.leadsPorEtapa.map((etapa) => {
              const percentual =
                metricas.totalLeads > 0
                  ? Math.round((etapa.total / metricas.totalLeads) * 100)
                  : 0

              return (
                <div
                  key={etapa.etapa}
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
