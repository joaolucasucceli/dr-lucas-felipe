"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Stethoscope, Calendar, Clock, Timer, FileText, AlertTriangle } from "lucide-react"
import type { Agendamento } from "@/hooks/use-agendamentos"

interface Lead {
  id: string
  nome: string
  whatsapp: string
}

interface Procedimento {
  id: string
  nome: string
}

interface AgendamentoFormProps {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  leadIdInicial?: string
  dataHoraInicial?: string
  agendamento?: Agendamento
}

export function AgendamentoForm({
  aberto,
  onFechar,
  onSalvo,
  leadIdInicial,
  dataHoraInicial,
  agendamento,
}: AgendamentoFormProps) {
  const editando = !!agendamento

  const [leadId, setLeadId] = useState(leadIdInicial || agendamento?.leadId || "")
  const [procedimentoId, setProcedimentoId] = useState(agendamento?.procedimentoId || "")
  const [data, setData] = useState("")
  const [hora, setHora] = useState("")
  const [duracao, setDuracao] = useState(String(agendamento?.duracao || 60))
  const [observacao, setObservacao] = useState(agendamento?.observacao || "")
  const [googleConfigurado, setGoogleConfigurado] = useState(true)

  const [leads, setLeads] = useState<Lead[]>([])
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return

    // Preencher data/hora do agendamento existente ou inicial
    const dataHora = agendamento?.dataHora || dataHoraInicial
    if (dataHora) {
      const dt = new Date(dataHora)
      setData(dt.toISOString().slice(0, 10))
      setHora(dt.toTimeString().slice(0, 5))
    } else {
      setData("")
      setHora("")
    }

    setLeadId(leadIdInicial || agendamento?.leadId || "")
    setProcedimentoId(agendamento?.procedimentoId || "")
    setDuracao(String(agendamento?.duracao || 60))
    setObservacao(agendamento?.observacao || "")

    fetch("/api/leads?porPagina=100")
      .then((r) => r.json())
      .then((j) => setLeads(j.dados || []))
      .catch(() => {})

    fetch("/api/procedimentos?ativo=true")
      .then((r) => r.json())
      .then((j) => setProcedimentos(j.dados || []))
      .catch(() => {})

    fetch("/api/configuracoes/google-agenda/status")
      .then((r) => r.json())
      .then((j) => setGoogleConfigurado(j.configurado && j.conectado))
      .catch(() => setGoogleConfigurado(true))
  }, [aberto, agendamento, leadIdInicial, dataHoraInicial])

  async function handleSalvar() {
    if (!leadId || !data || !hora) {
      toast.error("Paciente, data e hora são obrigatórios")
      return
    }

    setSalvando(true)
    try {
      const dataHora = new Date(`${data}T${hora}:00`).toISOString()
      const body = {
        leadId,
        procedimentoId: procedimentoId || null,
        dataHora,
        duracao: Number(duracao),
        observacao: observacao || null,
      }

      const url = editando ? `/api/agendamentos/${agendamento.id}` : "/api/agendamentos"
      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error()
      toast.success(editando ? "Agendamento atualizado" : "Agendamento criado")
      onSalvo()
      onFechar()
    } catch {
      toast.error("Erro ao salvar agendamento")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {!editando && !googleConfigurado && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm dark:border-yellow-700 dark:bg-yellow-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-800 dark:text-yellow-300">
                Google Calendar não está configurado. O agendamento será salvo, mas não será criado na agenda.{" "}
                <Link
                  href="/configuracoes/google-agenda"
                  className="font-medium underline"
                  onClick={onFechar}
                >
                  Configurar agora →
                </Link>
              </span>
            </div>
          )}

          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5"><User className="h-4 w-4 text-muted-foreground" />Paciente</Label>
            <Select value={leadId} onValueChange={setLeadId} disabled={!!leadIdInicial && !editando}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o paciente..." />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5"><Stethoscope className="h-4 w-4 text-muted-foreground" />Procedimento</Label>
            <Select value={procedimentoId || "nenhum"} onValueChange={(v) => setProcedimentoId(v === "nenhum" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                {procedimentos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-muted-foreground" />Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" />Hora</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5"><Timer className="h-4 w-4 text-muted-foreground" />Duração</Label>
            <Select value={duracao} onValueChange={setDuracao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1h 30min</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-muted-foreground" />Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Observações adicionais..."
            />
          </div>

          {editando && agendamento?.googleEventUrl && (
            <a
              href={agendamento.googleEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              Ver no Google Calendar
            </a>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? "Salvando..." : editando ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
