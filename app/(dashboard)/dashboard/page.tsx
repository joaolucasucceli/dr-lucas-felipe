"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Users, UserPlus, Calendar, TrendingUp, Bot, GitBranch, PieChart, Clock, Bell } from "lucide-react"
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
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { GraficoFunil } from "@/components/features/dashboard/GraficoFunil"
import { GraficoOrigem } from "@/components/features/dashboard/GraficoOrigem"
import { LeadsAlerta } from "@/components/features/dashboard/LeadsAlerta"
import { LeadsFollowUpAtivos } from "@/components/features/dashboard/LeadsFollowUpAtivos"
import { useDashboard } from "@/hooks/use-dashboard"

export default function DashboardPage() {
  const { data: session } = useSession()
  const perfil = session?.user?.perfil
  const isAtendente = perfil === "atendente"
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
        {isAtendente ? (
          <MetricCard
            titulo="Leads do Dia"
            valor={metricas.leadsHoje}
            descricao="Novos leads criados hoje"
            icone={<UserPlus className="h-5 w-5" />}
          />
        ) : (
          <MetricCard
            titulo="Taxa de Conversão"
            valor={`${metricas.taxaConversao}%`}
            descricao="Leads que agendaram ou além"
            icone={<TrendingUp className="h-5 w-5" />}
          />
        )}
      </div>

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

        {isAtendente ? (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Agendamentos da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-4">
                <span className="text-sm text-muted-foreground">Agendamentos nos próximos 7 dias</span>
                <span className="text-2xl font-bold">{metricas.agendamentosSemana}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoOrigem dados={metricas.leadsPorOrigem} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className={`mt-4 grid gap-4 ${isAtendente ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {!isAtendente && (
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
        )}

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">
              Follow-ups Aguardando Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsFollowUpAtivos />
          </CardContent>
        </Card>

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
  )
}
