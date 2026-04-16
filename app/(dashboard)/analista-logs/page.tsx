"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useAnalistaLogs,
  type AnalistaLogComLead,
} from "@/hooks/use-analista-logs"

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AnalistaLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [apenasDivergentes, setApenasDivergentes] = useState(false)
  const [logSelecionado, setLogSelecionado] = useState<AnalistaLogComLead | null>(
    null
  )

  const autorizado = session?.user?.perfil === "gestor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  const { logs, total, carregando, erro, recarregar } = useAnalistaLogs({
    apenasDivergentes,
  })

  if (status === "loading" || !autorizado) return null

  const totalDivergentes = logs.filter((l) => l.divergencias.length > 0).length
  const totalErros = logs.filter((l) => l.erro).length

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Analista IA — Logs" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={() => recarregar()} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Analista IA — Logs"
        descricao="Auditoria da Analista IA (JLAU-571 Fase 1 — shadow mode). Ela analisa cada conversa e registra o que DEVERIA estar no CRM, sem aplicar alteracoes ainda."
      >
        <Button
          variant={apenasDivergentes ? "default" : "outline"}
          size="sm"
          onClick={() => setApenasDivergentes((v) => !v)}
        >
          {apenasDivergentes ? "Mostrando so divergentes" : "So com divergencias"}
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de analises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com divergencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDivergentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErros}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        {carregando && logs.length === 0 ? (
          <SkeletonCard />
        ) : logs.length === 0 ? (
          <EmptyState
            titulo="Nenhum log ainda"
            descricao="A Analista IA gera logs a cada resposta da Ana Julia. Em shadow mode nao altera nada no CRM."
          />
        ) : (
          <div className="grid gap-3">
            {logs.map((log) => (
              <Card
                key={log.id}
                className="cursor-pointer transition-colors hover:bg-muted/40"
                onClick={() => setLogSelecionado(log)}
              >
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.leads.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {log.leads.whatsapp}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {formatarData(log.criadoEm)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {log.output?.justificativa ?? "(sem justificativa)"}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline" className="text-xs">
                        Atual: {log.estadoAtualLead?.statusFunil}
                      </Badge>
                      {log.output?.etapaCorreta &&
                        log.output.etapaCorreta !== "manter" && (
                          <Badge variant="default" className="text-xs">
                            Proposto: {log.output.etapaCorreta}
                          </Badge>
                        )}
                      {log.output?.qualificacaoComercial?.score !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          Score: {log.output.qualificacaoComercial.score}
                        </Badge>
                      )}
                      {log.divergencias.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {log.divergencias.length} divergencia(s)
                        </Badge>
                      )}
                      {log.aplicado && (
                        <Badge variant="default" className="text-xs">
                          Aplicado
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {log.erro ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : log.divergencias.length > 0 ? (
                      <Info className="h-5 w-5 text-orange-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!logSelecionado}
        onOpenChange={(aberto) => !aberto && setLogSelecionado(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da analise</DialogTitle>
          </DialogHeader>
          {logSelecionado && (
            <ScrollArea className="max-h-[65vh] pr-3">
              <div className="space-y-4">
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Lead</h3>
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div>Nome: {logSelecionado.leads.nome}</div>
                    <div>WhatsApp: {logSelecionado.leads.whatsapp}</div>
                    <div>
                      Status atual: {logSelecionado.estadoAtualLead.statusFunil}
                    </div>
                  </div>
                </section>

                {logSelecionado.erro && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-destructive">
                      Erro
                    </h3>
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {logSelecionado.erro}
                    </div>
                  </section>
                )}

                {logSelecionado.output && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">
                      Output da Analista
                    </h3>
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(logSelecionado.output, null, 2)}
                    </pre>
                  </section>
                )}

                {logSelecionado.divergencias.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-orange-600">
                      Divergencias ({logSelecionado.divergencias.length})
                    </h3>
                    <div className="space-y-2">
                      {logSelecionado.divergencias.map((d, i) => (
                        <div
                          key={i}
                          className="rounded-md border border-orange-200 bg-orange-50 p-2 text-xs dark:border-orange-900 dark:bg-orange-950"
                        >
                          <div className="font-semibold">{d.campo}</div>
                          <div className="mt-1 text-muted-foreground">
                            Atual: <code>{JSON.stringify(d.atual)}</code>
                          </div>
                          <div className="text-muted-foreground">
                            Proposto: <code>{JSON.stringify(d.proposto)}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="mb-2 text-sm font-semibold">
                    Historico enviado ({logSelecionado.historicoMensagens.length}{" "}
                    mensagens)
                  </h3>
                  <div className="space-y-1 rounded-md bg-muted p-3 text-xs">
                    {logSelecionado.historicoMensagens.map((m, i) => (
                      <div
                        key={i}
                        className={
                          m.remetente === "paciente"
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        <span className="font-semibold">
                          [
                          {m.remetente === "paciente"
                            ? "PAC"
                            : m.remetente === "atendente"
                              ? "ATD"
                              : "ANA"}
                          ]
                        </span>{" "}
                        {m.conteudo}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
