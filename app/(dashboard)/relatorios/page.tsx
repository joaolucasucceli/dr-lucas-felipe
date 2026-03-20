"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { BarChart3, Users, Calendar, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { MetricCard } from "@/components/features/shared/MetricCard"
import { FiltroRelatorio } from "@/components/features/relatorios/FiltroRelatorio"
import { GraficoFunilRelatorio } from "@/components/features/relatorios/GraficoFunilRelatorio"
import { TabelaProcedimentos } from "@/components/features/relatorios/TabelaProcedimentos"
import { useRelatorio, exportarRelatorio } from "@/hooks/use-relatorio"

function periodoDefault() {
  const hoje = new Date()
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    inicio: trintaDiasAtras.toISOString().slice(0, 10),
    fim: hoje.toISOString().slice(0, 10),
  }
}

export default function RelatoriosPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const defaultPeriodo = periodoDefault()

  const perfil = session?.user?.perfil
  const autorizado = perfil === "gestor" || perfil === "desenvolvedor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  const [funilInicio, setFunilInicio] = useState(defaultPeriodo.inicio)
  const [funilFim, setFunilFim] = useState(defaultPeriodo.fim)
  const [funilGerado, setFunilGerado] = useState(false)
  const funilRelatorio = useRelatorio({ tipo: "funil", dataInicio: funilInicio, dataFim: funilFim })

  const [receitaInicio, setReceitaInicio] = useState(defaultPeriodo.inicio)
  const [receitaFim, setReceitaFim] = useState(defaultPeriodo.fim)
  const [receitaGerado, setReceitaGerado] = useState(false)
  const receitaRelatorio = useRelatorio({ tipo: "receita", dataInicio: receitaInicio, dataFim: receitaFim })

  const [atendimentoInicio, setAtendimentoInicio] = useState(defaultPeriodo.inicio)
  const [atendimentoFim, setAtendimentoFim] = useState(defaultPeriodo.fim)
  const [atendimentoGerado, setAtendimentoGerado] = useState(false)
  const atendimentoRelatorio = useRelatorio({ tipo: "atendimento", dataInicio: atendimentoInicio, dataFim: atendimentoFim })

  useEffect(() => {
    funilRelatorio.recarregar()
    setFunilGerado(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const funilDados = funilRelatorio.dados
  const receitaDados = receitaRelatorio.dados
  const atendimentoDados = atendimentoRelatorio.dados

  return (
    <div>
      <PageHeader titulo="Relatórios" descricao="Análise de desempenho do negócio" />

      <Tabs defaultValue="funil" className="mt-6">
        <TabsList>
          <TabsTrigger value="funil">
            <Users className="mr-2 h-4 w-4" />
            Funil
          </TabsTrigger>
          <TabsTrigger value="agendamentos">
            <Calendar className="mr-2 h-4 w-4" />
            Agendamentos
          </TabsTrigger>
          <TabsTrigger value="atendimento">
            <MessageSquare className="mr-2 h-4 w-4" />
            Atendimento IA
          </TabsTrigger>
        </TabsList>

        {/* TAB FUNIL */}
        <TabsContent value="funil" className="mt-4 space-y-6">
          <Card>
            <CardContent className="pt-4">
              <FiltroRelatorio
                dataInicio={funilInicio}
                dataFim={funilFim}
                onDataInicioChange={setFunilInicio}
                onDataFimChange={setFunilFim}
                onGerar={() => { funilRelatorio.recarregar(); setFunilGerado(true) }}
                onExportar={() => exportarRelatorio("leads", funilInicio, funilFim)}
                carregando={funilRelatorio.carregando}
              />
            </CardContent>
          </Card>

          {funilGerado && funilDados && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  titulo="Total de Entradas"
                  valor={funilDados.totalEntradas ?? 0}
                  descricao="Leads criados no período"
                  icone={<Users className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  titulo="Taxa de Conversão"
                  valor={`${funilDados.taxaConversaoGeral ?? 0}%`}
                  descricao="Chegaram à consulta agendada ou além"
                  icone={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  titulo="Tempo Médio"
                  valor={`${funilDados.tempoMedioEtapas ?? 0} dias`}
                  descricao="Da entrada à conversão"
                  icone={<Calendar className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  titulo="Leads Perdidos"
                  valor={
                    (funilDados.funil as { etapa: string; total: number }[])?.find(
                      (e) => e.etapa === "perdido"
                    )?.total ?? 0
                  }
                  descricao="Status: perdido"
                  icone={<Users className="h-4 w-4 text-muted-foreground" />}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição do Funil</CardTitle>
                </CardHeader>
                <CardContent>
                  <GraficoFunilRelatorio dados={funilDados.funil ?? []} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB AGENDAMENTOS */}
        <TabsContent value="agendamentos" className="mt-4 space-y-6">
          <Card>
            <CardContent className="pt-4">
              <FiltroRelatorio
                dataInicio={receitaInicio}
                dataFim={receitaFim}
                onDataInicioChange={setReceitaInicio}
                onDataFimChange={setReceitaFim}
                onGerar={() => { receitaRelatorio.recarregar(); setReceitaGerado(true) }}
                onExportar={() => exportarRelatorio("agendamentos", receitaInicio, receitaFim)}
                carregando={receitaRelatorio.carregando}
              />
            </CardContent>
          </Card>

          {receitaGerado && receitaDados && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  titulo="Total de Agendamentos"
                  valor={receitaDados.agendamentos?.total ?? 0}
                  descricao="No período selecionado"
                  icone={<Calendar className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  titulo="Realizados"
                  valor={receitaDados.agendamentos?.realizados ?? 0}
                  descricao="Status: realizado"
                  icone={<Calendar className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  titulo="Taxa de Realização"
                  valor={`${receitaDados.agendamentos?.taxaRealizacao ?? 0}%`}
                  descricao="Realizados / Total"
                  icone={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                />
              </div>

              {(receitaDados.procedimentos?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Procedimentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TabelaProcedimentos dados={receitaDados.procedimentos} />
                  </CardContent>
                </Card>
              )}

              {(receitaDados.origem?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Conversão por Origem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Origem</th>
                            <th className="pb-2 font-medium text-right">Leads</th>
                            <th className="pb-2 font-medium text-right">Agendamentos</th>
                            <th className="pb-2 font-medium text-right">Conversão</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(receitaDados.origem as { origem: string; leads: number; agendamentos: number; conversao: number }[]).map((o) => (
                            <tr key={o.origem} className="border-b last:border-0">
                              <td className="py-2">{o.origem}</td>
                              <td className="py-2 text-right">{o.leads}</td>
                              <td className="py-2 text-right">{o.agendamentos}</td>
                              <td className="py-2 text-right text-muted-foreground">{o.conversao}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB ATENDIMENTO IA */}
        <TabsContent value="atendimento" className="mt-4 space-y-6">
          <Card>
            <CardContent className="pt-4">
              <FiltroRelatorio
                dataInicio={atendimentoInicio}
                dataFim={atendimentoFim}
                onDataInicioChange={setAtendimentoInicio}
                onDataFimChange={setAtendimentoFim}
                onGerar={() => { atendimentoRelatorio.recarregar(); setAtendimentoGerado(true) }}
                onExportar={() => exportarRelatorio("conversas", atendimentoInicio, atendimentoFim)}
                carregando={atendimentoRelatorio.carregando}
              />
            </CardContent>
          </Card>

          {atendimentoGerado && atendimentoDados && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  titulo="Total de Mensagens"
                  valor={atendimentoDados.mensagens?.total ?? 0}
                  descricao="Enviadas e recebidas"
                  icone={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  titulo="Enviadas pela IA"
                  valor={atendimentoDados.mensagens?.enviadas ?? 0}
                  descricao="Remetente: agente"
                  icone={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  titulo="Conversas Ativas"
                  valor={atendimentoDados.conversas?.ativas ?? 0}
                  descricao="Não encerradas"
                  icone={<Users className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  titulo="Follow-ups Enviados"
                  valor={atendimentoDados.followUps?.enviados ?? 0}
                  descricao={`Taxa de resposta: ${atendimentoDados.followUps?.taxaResposta ?? 0}%`}
                  icone={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Mensagens</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        { nome: "Enviadas (IA)", valor: atendimentoDados.mensagens?.enviadas ?? 0, cor: "#a5b4fc" },
                        { nome: "Recebidas", valor: atendimentoDados.mensagens?.recebidas ?? 0, cor: "#86efac" },
                      ]}
                      margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                        <Cell fill="#a5b4fc" />
                        <Cell fill="#86efac" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
