"use client"

import { useState } from "react"
import { Users, UserPlus, Calendar, TrendingUp, Bot } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { MetricCard } from "@/components/features/shared/MetricCard"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { GraficoFunil } from "@/components/features/dashboard/GraficoFunil"
import { GraficoOrigem } from "@/components/features/dashboard/GraficoOrigem"
import { LeadsAlerta } from "@/components/features/dashboard/LeadsAlerta"
import { useDashboard } from "@/hooks/use-dashboard"

export default function DashboardPage() {
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
          <LoadingState colunas={4} linhas={6} />
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
      </PageHeader>

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
        <MetricCard
          titulo="Taxa de Conversão"
          valor={`${metricas.taxaConversao}%`}
          descricao="Leads que agendaram ou além"
          icone={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoFunil dados={metricas.leadsPorEtapa} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoOrigem dados={metricas.leadsPorOrigem} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Atividade do Agente IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mensagens enviadas</span>
                <span className="text-sm font-medium">{metricas.mensagensEnviadasPelaIA}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Follow-ups enviados</span>
                <span className="text-sm font-medium">{metricas.followUpsEnviados}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confirmações enviadas</span>
                <span className="text-sm font-medium">{metricas.confirmacaoEnviadas}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
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
  )
}
