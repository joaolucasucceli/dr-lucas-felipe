"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Users, UserPlus, Calendar, TrendingUp, GitBranch, Bell, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { MetricCard } from "@/components/features/shared/MetricCard"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { GraficoFunil } from "@/components/features/dashboard/GraficoFunil"
import { LeadsAlerta } from "@/components/features/dashboard/LeadsAlerta"
import { CardResumoAnaJulia } from "@/components/features/dashboard/CardResumoAnaJulia"
import { useDashboard } from "@/hooks/use-dashboard"
import { exportarRelatorio } from "@/hooks/use-relatorio"

export default function DashboardPage() {
  const { data: session } = useSession()
  const perfil = session?.user?.perfil
  const isGestor = perfil === "gestor"
  const [periodo, setPeriodo] = useState("mes")
  const { metricas, carregando, erro, recarregar } = useDashboard(periodo)

  if (carregando) {
    return (
      <div>
        <PageHeader
          titulo="Dashboard"
          descricao="Visão geral do funil e atividade"
        />
        <div className="mt-6">
          <SkeletonCard quantidade={4} />
        </div>
      </div>
    )
  }

  if (erro || !metricas) {
    return (
      <div>
        <PageHeader
          titulo="Dashboard"
          descricao="Visão geral do funil e atividade"
        />
        <div className="mt-6">
          <ErrorState mensagem={erro || "Erro ao carregar métricas"} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  const labelPeriodo: Record<string, string> = {
    hoje: "hoje",
    semana: "na semana",
    mes: "no mês",
    total: "no total",
  }

  return (
    <div>
      <PageHeader
        titulo="Dashboard"
        descricao="Visão geral do funil e atividade"
      >
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Última semana</SelectItem>
            <SelectItem value="mes">Último mês</SelectItem>
            <SelectItem value="total">Total</SelectItem>
          </SelectContent>
        </Select>

        {isGestor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportarRelatorio("leads")}>
                Exportar Leads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarRelatorio("agendamentos")}>
                Exportar Agendamentos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarRelatorio("conversas")}>
                Exportar Conversas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </PageHeader>

      {/* Metric Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          titulo="Total de Leads"
          valor={metricas.totalLeads}
          descricao={`${metricas.leadsNovosNoPeriodo} novos ${labelPeriodo[periodo]}`}
          icone={<Users className="h-5 w-5" />}
        />
        <MetricCard
          titulo="Novos no Período"
          valor={metricas.leadsNovosNoPeriodo}
          icone={<UserPlus className="h-5 w-5" />}
        />
        <MetricCard
          titulo="Agendamentos"
          valor={metricas.agendamentosNoPeriodo}
          descricao={`${metricas.agendamentosRealizados} realizados`}
          icone={<Calendar className="h-5 w-5" />}
        />
        {isGestor ? (
          <MetricCard
            titulo="Taxa de Conversão"
            valor={`${metricas.taxaConversao}%`}
            descricao="Leads que agendaram ou além"
            icone={<TrendingUp className="h-5 w-5" />}
          />
        ) : (
          <MetricCard
            titulo="Leads do Dia"
            valor={metricas.leadsHoje}
            descricao="Novos leads criados hoje"
            icone={<UserPlus className="h-5 w-5" />}
          />
        )}
      </div>

      {/* Funil + Ana Júlia / Leads em Alerta */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Funil por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoFunil dados={metricas.leadsPorEtapa} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {isGestor && (
            <CardResumoAnaJulia
              mensagensEnviadas={metricas.mensagensEnviadasPelaIA}
              followUpsEnviados={metricas.followUpsEnviados}
              confirmacaoEnviadas={metricas.confirmacaoEnviadas}
            />
          )}

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Leads em Alerta ({metricas.leadsEmAlerta})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadsAlerta />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
