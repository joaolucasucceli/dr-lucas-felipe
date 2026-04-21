"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, ExternalLink, User } from "lucide-react"
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
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { useAgenda, type AgendamentoAgenda } from "@/hooks/use-agenda"

const TZ = "America/Sao_Paulo"

function chaveDia(dataIso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dataIso))
}

function labelDia(chave: string): string {
  const [ano, mes, dia] = chave.split("-").map(Number)
  const data = new Date(`${chave}T12:00:00-03:00`)

  const hojeChave = chaveDia(new Date().toISOString())
  const amanhaTs = new Date()
  amanhaTs.setDate(amanhaTs.getDate() + 1)
  const amanhaChave = chaveDia(amanhaTs.toISOString())

  const formatoLongo = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(data)

  if (chave === hojeChave) return `Hoje — ${formatoLongo}`
  if (chave === amanhaChave) return `Amanhã — ${formatoLongo}`
  return formatoLongo.charAt(0).toUpperCase() + formatoLongo.slice(1)
}

function formatarHora(dataIso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dataIso))
}

function agruparPorDia(agendamentos: AgendamentoAgenda[]): {
  chave: string
  itens: AgendamentoAgenda[]
}[] {
  const mapa = new Map<string, AgendamentoAgenda[]>()
  for (const ag of agendamentos) {
    const chave = chaveDia(ag.dataHora)
    if (!mapa.has(chave)) mapa.set(chave, [])
    mapa.get(chave)!.push(ag)
  }
  return Array.from(mapa.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([chave, itens]) => ({ chave, itens }))
}

export default function AgendaPage() {
  const router = useRouter()
  const [periodo, setPeriodo] = useState("semana")
  const { agendamentos, total, carregando, erro, recarregar } = useAgenda(periodo)

  const metricas = useMemo(() => {
    const hojeChaveStr = chaveDia(new Date().toISOString())
    const hoje = agendamentos.filter((a) => chaveDia(a.dataHora) === hojeChaveStr).length
    const confirmados = agendamentos.filter((a) => a.status === "confirmado").length
    const aguardando = agendamentos.filter((a) => a.status === "agendado").length
    return { hoje, confirmados, aguardando }
  }, [agendamentos])

  const grupos = useMemo(() => agruparPorDia(agendamentos), [agendamentos])

  return (
    <div>
      <PageHeader
        titulo="Agenda"
        descricao="Próximas avaliações agendadas pela Ana Júlia"
      >
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Próximos 7 dias</SelectItem>
            <SelectItem value="mes">Próximos 30 dias</SelectItem>
            <SelectItem value="passado">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {carregando ? (
        <div className="mt-6">
          <SkeletonCard quantidade={3} />
        </div>
      ) : erro ? (
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              titulo="Total no período"
              valor={total}
              descricao="Agendamentos listados"
              icone={<Calendar className="h-5 w-5" />}
            />
            <MetricCard
              titulo="Hoje"
              valor={metricas.hoje}
              descricao="Avaliações do dia"
              icone={<Clock className="h-5 w-5" />}
            />
            <MetricCard
              titulo="Confirmados"
              valor={metricas.confirmados}
              descricao="Paciente confirmou presença"
              icone={<User className="h-5 w-5" />}
            />
            <MetricCard
              titulo="Aguardando confirmação"
              valor={metricas.aguardando}
              descricao="Status 'agendado'"
              icone={<Clock className="h-5 w-5" />}
            />
          </div>

          <div className="mt-8 space-y-6">
            {grupos.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum agendamento no período selecionado.
                </CardContent>
              </Card>
            ) : (
              grupos.map((grupo) => (
                <Card key={grupo.chave}>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      {labelDia(grupo.chave)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {grupo.itens.map((ag) => (
                      <div
                        key={ag.id}
                        className="flex cursor-pointer items-center gap-4 py-3 transition-colors hover:bg-muted/50 -mx-6 px-6"
                        onClick={() =>
                          ag.contato && router.push(`/contatos/${ag.contato.id}`)
                        }
                      >
                        <div className="flex min-w-[70px] flex-col">
                          <span className="text-lg font-semibold tabular-nums">
                            {formatarHora(ag.dataHora)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {ag.duracao}min
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {ag.contato?.nome || "Contato removido"}
                            </span>
                            {ag.contato?.tipo === "paciente" && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                Paciente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {ag.procedimento?.nome ? (
                              <span className="truncate">{ag.procedimento.nome}</span>
                            ) : (
                              <span className="italic">Sem procedimento</span>
                            )}
                            {ag.contato?.whatsapp && (
                              <>
                                <span>•</span>
                                <span>{ag.contato.whatsapp}</span>
                              </>
                            )}
                          </div>
                          {ag.observacao && (
                            <p className="mt-1 text-xs text-muted-foreground truncate">
                              {ag.observacao}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={ag.status} variante="agendamento" />
                          {ag.googleEventUrl && (
                            <a
                              href={ag.googleEventUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground"
                              title="Abrir no Google Calendar"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
