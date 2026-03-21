"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { MessageSquare, Users, Calendar, Bell } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { MetricCard } from "@/components/features/shared/MetricCard"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { CardFunilIA } from "@/components/features/ana-julia/CardFunilIA"
import { GraficoAtividade } from "@/components/features/ana-julia/GraficoAtividade"
import { useAnaJulia } from "@/hooks/use-ana-julia"

type Periodo = "hoje" | "semana" | "mes"

function calcularPeriodo(periodo: Periodo): { dataInicio: string; dataFim: string } {
  const hoje = new Date()
  const fim = hoje.toISOString().slice(0, 10)

  if (periodo === "hoje") {
    return { dataInicio: fim, dataFim: fim }
  }

  if (periodo === "semana") {
    const inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { dataInicio: inicio.toISOString().slice(0, 10), dataFim: fim }
  }

  // mes
  const inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
  return { dataInicio: inicio.toISOString().slice(0, 10), dataFim: fim }
}

export default function AnaJuliaPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [periodo, setPeriodo] = useState<Periodo>("semana")

  const perfil = session?.user?.perfil
  const autorizado = perfil === "gestor" || perfil === "desenvolvedor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  const { dataInicio, dataFim } = calcularPeriodo(periodo)
  const { dados, carregando, erro, recarregar } = useAnaJulia({ dataInicio, dataFim })

  const carregarDados = useCallback(() => {
    recarregar()
  }, [recarregar])

  useEffect(() => {
    if (status === "authenticated" && autorizado) {
      carregarDados()
    }
  }, [status, autorizado, periodo, carregarDados])

  const totalFollowUps = dados
    ? (dados.followUps.f1h ?? 0) + (dados.followUps.f6h ?? 0) + (dados.followUps.f24h ?? 0)
    : 0

  const periodoLabels: Record<Periodo, string> = {
    hoje: "Hoje",
    semana: "Esta Semana",
    mes: "Este Mês",
  }

  return (
    <div>
      <PageHeader
        titulo="Ana Júlia"
        descricao="Desempenho do agente IA de atendimento"
      >
        <div className="flex gap-1">
          {(["hoje", "semana", "mes"] as Periodo[]).map((p) => (
            <Button
              key={p}
              variant={periodo === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodo(p)}
            >
              {periodoLabels[p]}
            </Button>
          ))}
        </div>
      </PageHeader>

      {carregando && (
        <div className="mt-6">
          <SkeletonCard quantidade={4} />
        </div>
      )}

      {!carregando && erro && (
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={carregarDados} />
        </div>
      )}

      {!carregando && !erro && dados && dados.mensagens.total === 0 && dados.conversas.total === 0 && (
        <div className="mt-6">
          <EmptyState
            titulo="Sem atividade no período"
            descricao="A Ana Júlia ainda não registrou mensagens nesse período."
          />
        </div>
      )}

      {!carregando && !erro && dados && (
        <div className="mt-6 space-y-6">
          {/* Row 1 — Métricas principais */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              titulo="Mensagens Enviadas"
              valor={dados.mensagens.enviadas}
              descricao={`${dados.mensagens.recebidas} recebidas dos pacientes`}
              icone={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              titulo="Leads Atendidos"
              valor={dados.conversas.total}
              descricao={`${dados.conversas.ativas} conversas ainda ativas`}
              icone={<Users className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              titulo="Agendamentos Marcados"
              valor={dados.funil.agendados}
              descricao={`${dados.funil.realizados} consultas realizadas`}
              icone={<Calendar className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              titulo="Follow-ups Enviados"
              valor={totalFollowUps}
              descricao={`1h: ${dados.followUps.f1h} · 6h: ${dados.followUps.f6h} · 24h: ${dados.followUps.f24h}`}
              icone={<Bell className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Row 2 — Funil + Detalhes */}
          <div className="grid gap-4 lg:grid-cols-2">
            <CardFunilIA funil={dados.funil} />

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Follow-ups & Confirmações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Follow-ups enviados
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "1h", valor: dados.followUps.f1h },
                      { label: "6h", valor: dados.followUps.f6h },
                      { label: "24h", valor: dados.followUps.f24h },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-md border bg-muted/40 p-3 text-center"
                      >
                        <div className="text-xl font-bold">{item.valor}</div>
                        <div className="text-xs text-muted-foreground">{item.label} após</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Confirmações de consulta
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "6h antes", valor: dados.confirmacoes.c6h },
                      { label: "3h antes", valor: dados.confirmacoes.c3h },
                      { label: "30min", valor: dados.confirmacoes.c30min },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-md border bg-muted/40 p-3 text-center"
                      >
                        <div className="text-xl font-bold">{item.valor}</div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3 — Atividade por dia */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Atividade por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoAtividade dados={dados.atividadePorDia} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
