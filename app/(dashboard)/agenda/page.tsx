"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { DataTable, type ColunaConfig } from "@/components/features/shared/DataTable"
import { AgendamentoForm } from "@/components/features/agendamentos/AgendamentoForm"
import { ReagendarDialog } from "@/components/features/agendamentos/ReagendarDialog"
import { useAgenda, type AgendamentoAgenda } from "@/hooks/use-agenda"
import { formatarWhatsapp } from "@/lib/format"

const TZ = "America/Sao_Paulo"

function chaveDia(dataIso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dataIso))
}

function formatarDiaCurto(dataIso: string): string {
  const hojeChave = chaveDia(new Date().toISOString())
  const amanhaTs = new Date()
  amanhaTs.setDate(amanhaTs.getDate() + 1)
  const amanhaChave = chaveDia(amanhaTs.toISOString())
  const chaveItem = chaveDia(dataIso)

  if (chaveItem === hojeChave) return "Hoje"
  if (chaveItem === amanhaChave) return "Amanhã"

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(dataIso))
}

function formatarHora(dataIso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dataIso))
}

export default function AgendaPage() {
  const router = useRouter()
  const [periodo, setPeriodo] = useState("semana")
  const [agendamentoEditando, setAgendamentoEditando] = useState<AgendamentoAgenda | null>(null)
  const [reagendando, setReagendando] = useState<AgendamentoAgenda | null>(null)
  const [cancelando, setCancelando] = useState<AgendamentoAgenda | null>(null)
  const [processando, setProcessando] = useState(false)
  const { agendamentos, carregando, erro, recarregar } = useAgenda(periodo)

  function abrirEdicao(ag: AgendamentoAgenda) {
    setAgendamentoEditando(ag)
  }

  async function confirmarCancelamento() {
    if (!cancelando) return
    setProcessando(true)
    try {
      const res = await fetch(`/api/agendamentos/${cancelando.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Erro ao cancelar")
      }
      toast.success("Agendamento cancelado — paciente foi notificado")
      recarregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar")
    } finally {
      setProcessando(false)
      setCancelando(null)
    }
  }

  const colunas: ColunaConfig<AgendamentoAgenda>[] = [
    {
      chave: "dataHora",
      titulo: "Quando",
      renderizar: (ag) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold capitalize">
            {formatarDiaCurto(ag.dataHora)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatarHora(ag.dataHora)} · {ag.duracao}min
          </span>
        </div>
      ),
    },
    {
      chave: "contato",
      titulo: "Paciente",
      renderizar: (ag) =>
        ag.contato ? (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => router.push(`/contatos/${ag.contato!.id}`)}
              className="text-left text-sm font-medium hover:underline"
            >
              {ag.contato.nome}
            </button>
            <span className="text-xs text-muted-foreground">
              {formatarWhatsapp(ag.contato.whatsapp)}
              {ag.contato.tipo === "paciente" && " · Paciente"}
            </span>
          </div>
        ) : (
          <span className="text-sm italic text-muted-foreground">Contato removido</span>
        ),
    },
    {
      chave: "procedimento",
      titulo: "Procedimento",
      classesCelula: "hidden md:table-cell",
      renderizar: (ag) =>
        ag.procedimento?.nome ? (
          <span className="text-sm">{ag.procedimento.nome}</span>
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
        ),
    },
    {
      chave: "status",
      titulo: "Status",
      renderizar: (ag) => <StatusBadge status={ag.status} variante="agendamento" />,
    },
    {
      chave: "acoes" as keyof AgendamentoAgenda,
      titulo: "",
      classesCelula: "w-[100px]",
      renderizar: (ag) => (
        <div className="flex items-center justify-end gap-1">
          {ag.googleEventUrl && (
            <a
              href={ag.googleEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="Abrir no Google Calendar"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => abrirEdicao(ag)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar observação
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReagendando(ag)}>
                <CalendarClock className="mr-2 h-4 w-4" />
                Reagendar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setCancelando(ag)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Cancelar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        titulo="Agenda"
        descricao="Agendamentos são criados exclusivamente pela Ana Júlia via WhatsApp"
      >
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]">
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

      {erro ? (
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      ) : (
        <div className="mt-6">
          {carregando && agendamentos.length === 0 ? (
            <SkeletonTabela linhas={5} colunas={5} />
          ) : (
            <DataTable
              colunas={colunas}
              dados={agendamentos}
              total={agendamentos.length}
              pagina={1}
              porPagina={agendamentos.length || 10}
              onPaginaChange={() => {}}
              carregando={carregando}
              mensagemVazio="Nenhum agendamento no período selecionado."
            />
          )}
        </div>
      )}

      <AgendamentoForm
        agendamento={agendamentoEditando}
        aberto={!!agendamentoEditando}
        onFechar={() => setAgendamentoEditando(null)}
        onSucesso={recarregar}
      />

      <ReagendarDialog
        agendamento={reagendando}
        aberto={!!reagendando}
        onFechar={() => setReagendando(null)}
        onSucesso={recarregar}
      />

      <ConfirmDialog
        titulo="Cancelar agendamento?"
        descricao={
          cancelando
            ? `${cancelando.contato?.nome ?? "Paciente"} será notificado por email do cancelamento. O evento sai do Google Calendar.`
            : ""
        }
        aberto={!!cancelando}
        onFechar={() => setCancelando(null)}
        onConfirmar={confirmarCancelamento}
        variante="destrutivo"
        textoBotao="Cancelar agendamento"
        carregando={processando}
      />
    </div>
  )
}
