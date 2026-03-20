"use client"

import { useState } from "react"
import { Bell, AlertTriangle, Calendar, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useNotificacoes } from "@/hooks/use-notificacoes"

function formatarDataRelativa(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const horas = Math.floor(diff / (1000 * 60 * 60))
  const dias = Math.floor(horas / 24)
  if (dias > 0) return `há ${dias} dia${dias > 1 ? "s" : ""}`
  if (horas > 0) return `há ${horas}h`
  return "agora"
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function PainelNotificacoes() {
  const [aberto, setAberto] = useState(false)
  const { notificacoes, total } = useNotificacoes()

  function navegar(href: string) {
    setAberto(false)
    window.location.href = href
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
            >
              {total > 9 ? "9+" : total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">
            Notificações {total > 0 && `(${total})`}
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {total === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação no momento.
            </p>
          )}

          {notificacoes.leadsAlerta.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="mr-1 inline h-3 w-3 text-yellow-500" />
                Leads em alerta
              </p>
              {notificacoes.leadsAlerta.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => navegar(`/leads/${lead.id}`)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="flex-1 truncate">{lead.nome}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {lead.ultimaMovimentacaoEm
                      ? formatarDataRelativa(lead.ultimaMovimentacaoEm)
                      : "sem movimentação"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {notificacoes.agendamentosProximos.length > 0 && (
            <div className="border-t p-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                <Calendar className="mr-1 inline h-3 w-3 text-blue-500" />
                Agendamentos próximos
              </p>
              {notificacoes.agendamentosProximos.map((ag) => (
                <button
                  key={ag.id}
                  onClick={() => navegar("/agendamentos")}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="flex-1 truncate">{ag.lead.nome}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatarHora(ag.dataHora)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {notificacoes.leadsNovosIA.length > 0 && (
            <div className="border-t p-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                <Bot className="mr-1 inline h-3 w-3 text-green-500" />
                Novos leads da IA
              </p>
              {notificacoes.leadsNovosIA.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => navegar(`/leads/${lead.id}`)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="flex-1 truncate">{lead.nome}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatarDataRelativa(lead.criadoEm)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2">
          <button
            onClick={() => navegar("/leads")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Ver todos os leads
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
