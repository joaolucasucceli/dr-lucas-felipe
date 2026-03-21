"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { DataTable, type ColunaConfig } from "@/components/features/shared/DataTable"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { AgendamentoForm } from "@/components/features/agendamentos/AgendamentoForm"
import { useAgendamentos, type Agendamento } from "@/hooks/use-agendamentos"

const HORAS = Array.from({ length: 13 }, (_, i) => i + 8) // 8h..20h

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function inicioSemana(): Date {
  const hoje = new Date()
  const dia = hoje.getDay()
  const diff = hoje.getDate() - dia + (dia === 0 ? -6 : 1)
  const seg = new Date(hoje)
  seg.setDate(diff)
  seg.setHours(0, 0, 0, 0)
  return seg
}

export default function AgendamentosPage() {
  const router = useRouter()

  const [filtroStatus, setFiltroStatus] = useState("")
  const [filtroDataInicio, setFiltroDataInicio] = useState("")
  const [filtroDataFim, setFiltroDataFim] = useState("")
  const [filtroLead, setFiltroLead] = useState("")
  const [pagina, setPagina] = useState(1)

  const [formAberto, setFormAberto] = useState(false)
  const [agendamentoEditando, setAgendamentoEditando] = useState<Agendamento | undefined>()
  const [dataHoraInicial, setDataHoraInicial] = useState<string | undefined>()
  const [confirmCancelar, setConfirmCancelar] = useState<string | null>(null)

  const { dados, total, totalPaginas, carregando, erro, recarregar } = useAgendamentos({
    status: filtroStatus || undefined,
    dataInicio: filtroDataInicio || undefined,
    dataFim: filtroDataFim || undefined,
    pagina,
    porPagina: 20,
  })

  // Filtrar por lead nome no cliente (evitar endpoint extra)
  const dadosFiltrados = filtroLead
    ? dados.filter((a) => a.lead.nome.toLowerCase().includes(filtroLead.toLowerCase()))
    : dados

  const colunas: ColunaConfig<Agendamento>[] = [
    {
      chave: "lead",
      titulo: "Paciente",
      renderizar: (a) => (
        <button
          className="text-left hover:underline font-medium"
          onClick={() => router.push(`/leads/${a.leadId}`)}
        >
          {a.lead.nome}
        </button>
      ),
    },
    {
      chave: "procedimento",
      titulo: "Procedimento",
      renderizar: (a) => a.procedimento?.nome || <span className="text-muted-foreground">—</span>,
    },
    {
      chave: "dataHora",
      titulo: "Data/Hora",
      renderizar: (a) => formatarDataHora(a.dataHora),
    },
    {
      chave: "duracao",
      titulo: "Duração",
      renderizar: (a) => `${a.duracao} min`,
    },
    {
      chave: "status",
      titulo: "Status",
      renderizar: (a) => <StatusBadge status={a.status} variante="agendamento" />,
    },
    {
      chave: "sincronizado",
      titulo: "Google",
      renderizar: (a) =>
        a.googleEventUrl ? (
          <a
            href={a.googleEventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      chave: "id",
      titulo: "Ações",
      renderizar: (a) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAgendamentoEditando(a)
              setDataHoraInicial(undefined)
              setFormAberto(true)
            }}
          >
            Editar
          </Button>
          {a.status !== "cancelado" && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => setConfirmCancelar(a.id)}
            >
              Cancelar
            </Button>
          )}
        </div>
      ),
    },
  ]

  async function handleCancelar() {
    if (!confirmCancelar) return
    try {
      const res = await fetch(`/api/agendamentos/${confirmCancelar}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Agendamento cancelado")
      recarregar()
    } catch {
      toast.error("Erro ao cancelar agendamento")
    } finally {
      setConfirmCancelar(null)
    }
  }

  // View calendário — semana atual
  const semana = inicioSemana()
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana)
    d.setDate(semana.getDate() + i)
    return d
  })
  const nomesDias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

  function agendamentosNaHora(dia: Date, hora: number): Agendamento[] {
    return dados.filter((a) => {
      const dt = new Date(a.dataHora)
      return (
        dt.getDate() === dia.getDate() &&
        dt.getMonth() === dia.getMonth() &&
        dt.getFullYear() === dia.getFullYear() &&
        dt.getHours() === hora
      )
    })
  }

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Agendamentos">
          <Button onClick={() => { setAgendamentoEditando(undefined); setDataHoraInicial(undefined); setFormAberto(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </PageHeader>
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Agendamentos">
        <Button onClick={() => { setAgendamentoEditando(undefined); setDataHoraInicial(undefined); setFormAberto(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </PageHeader>

      <Tabs defaultValue="lista" className="mt-6">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          {carregando && dados.length === 0 ? (
            <SkeletonTabela linhas={6} colunas={6} />
          ) : !carregando && dadosFiltrados.length === 0 ? (
            <EmptyState
              titulo="Nenhum agendamento encontrado"
              descricao="Crie um novo agendamento ou ajuste os filtros."
              textoBotao="Novo Agendamento"
              onAcao={() => { setAgendamentoEditando(undefined); setDataHoraInicial(undefined); setFormAberto(true) }}
            />
          ) : (
          <DataTable
            colunas={colunas}
            dados={dadosFiltrados}
            total={total}
            pagina={pagina}
            porPagina={20}
            onPaginaChange={setPagina}
            carregando={carregando}
            filtros={
              <>
                <Input
                  placeholder="Buscar paciente..."
                  value={filtroLead}
                  onChange={(e) => setFiltroLead(e.target.value)}
                  className="w-48"
                />
                <Select
                  value={filtroStatus || "todos"}
                  onValueChange={(v) => { setFiltroStatus(v === "todos" ? "" : v); setPagina(1) }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="remarcado">Remarcado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">De:</span>
                  <Input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => { setFiltroDataInicio(e.target.value); setPagina(1) }}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">Até:</span>
                  <Input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => { setFiltroDataFim(e.target.value); setPagina(1) }}
                    className="w-40"
                  />
                </div>
              </>
            }
          />
          )}
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[700px]"
              style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
            >
              {/* Cabeçalho */}
              <div />
              {diasSemana.map((dia, i) => (
                <div
                  key={i}
                  className="border-b pb-2 text-center text-sm font-medium"
                >
                  <div>{nomesDias[i]}</div>
                  <div className="text-muted-foreground">
                    {dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </div>
                </div>
              ))}

              {/* Linhas de horas */}
              {HORAS.map((hora) => (
                <>
                  <div
                    key={`h-${hora}`}
                    className="border-t pr-2 pt-1 text-right text-xs text-muted-foreground"
                  >
                    {hora}:00
                  </div>
                  {diasSemana.map((dia, i) => {
                    const slots = agendamentosNaHora(dia, hora)
                    const dataHoraSlot = new Date(dia)
                    dataHoraSlot.setHours(hora, 0, 0, 0)
                    return (
                      <div
                        key={`${hora}-${i}`}
                        className="border-t min-h-[48px] p-1 cursor-pointer hover:bg-accent/30"
                        onClick={() => {
                          if (slots.length === 0) {
                            setAgendamentoEditando(undefined)
                            setDataHoraInicial(dataHoraSlot.toISOString())
                            setFormAberto(true)
                          }
                        }}
                      >
                        {slots.map((a) => (
                          <div
                            key={a.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setAgendamentoEditando(a)
                              setDataHoraInicial(undefined)
                              setFormAberto(true)
                            }}
                            className="rounded bg-primary/20 px-1 py-0.5 text-xs cursor-pointer hover:bg-primary/30 truncate"
                          >
                            {a.lead.nome}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AgendamentoForm
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        onSalvo={recarregar}
        dataHoraInicial={dataHoraInicial}
        agendamento={agendamentoEditando}
      />

      <ConfirmDialog
        titulo="Cancelar agendamento"
        descricao="Tem certeza que deseja cancelar este agendamento? Esta ação também removerá o evento do Google Calendar, se houver."
        aberto={!!confirmCancelar}
        onFechar={() => setConfirmCancelar(null)}
        onConfirmar={handleCancelar}
        variante="destrutivo"
        textoBotao="Cancelar agendamento"
      />
    </div>
  )
}
