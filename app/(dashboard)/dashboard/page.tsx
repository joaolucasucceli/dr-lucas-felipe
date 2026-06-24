"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Users, UserPlus, Calendar, TrendingUp, GitBranch } from "lucide-react"
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
import { CardResumoAnaJulia } from "@/components/features/dashboard/CardResumoAnaJulia"
import { useDashboard } from "@/hooks/use-dashboard"

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
          descricao="Operação da Ana Júlia, leads e funil"
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
          descricao="Operação da Ana Júlia, leads e funil"
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
        descricao="Operação da Ana Júlia, leads e funil"
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
          descricao="Avaliações marcadas pela IA"
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
            descricao="Novos contatos criados hoje"
            icone={<UserPlus className="h-5 w-5" />}
          />
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Funil por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoFunil dados={metricas.leadsPorEtapa} />
          </CardContent>
        </Card>

        <CardResumoAnaJulia
          mensagensEnviadas={metricas.mensagensEnviadasPelaIA}
          followUpsEnviados={metricas.followUpsEnviados}
          confirmacaoEnviadas={metricas.confirmacaoEnviadas}
        />
      </div>
    </div>
  )
}
