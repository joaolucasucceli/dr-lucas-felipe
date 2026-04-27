"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  REGEX_DATA_BR,
  dataBrEHoraParaIso,
  isoParaDataBr,
  isoParaHora,
  mascararDataBr,
} from "@/lib/agendamento/data-br"
import type { AgendamentoAgenda } from "@/hooks/use-agenda"

interface ReagendarDialogProps {
  agendamento: AgendamentoAgenda | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function ReagendarDialog({
  agendamento,
  aberto,
  onFechar,
  onSucesso,
}: ReagendarDialogProps) {
  const [dataBr, setDataBr] = useState("")
  const [hora, setHora] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (aberto && agendamento) {
      setDataBr(isoParaDataBr(agendamento.dataHora))
      setHora(isoParaHora(agendamento.dataHora))
      setErro(null)
    }
  }, [aberto, agendamento])

  async function handleSalvar() {
    setErro(null)

    if (!REGEX_DATA_BR.test(dataBr)) {
      setErro("Use dd/mm ou dd/mm/aaaa")
      return
    }

    const novaIso = dataBrEHoraParaIso(dataBr, hora)
    if (!novaIso) {
      setErro("Data ou hora inválida")
      return
    }

    if (!agendamento) return

    if (novaIso === new Date(agendamento.dataHora).toISOString()) {
      setErro("Data/hora não mudou")
      return
    }

    setSalvando(true)
    try {
      const res = await fetch(`/api/agendamentos/${agendamento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataHora: novaIso }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Erro ao reagendar")
      }
      toast.success("Reagendado — paciente foi notificado")
      onSucesso()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reagendar")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar avaliação</DialogTitle>
          <DialogDescription>
            {agendamento?.contato?.nome ?? "Paciente"} — paciente recebe email
            avisando da nova data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="reag-data">Nova data</Label>
              <Input
                id="reag-data"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm"
                maxLength={10}
                value={dataBr}
                onChange={(e) => setDataBr(mascararDataBr(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reag-hora">Hora</Label>
              <Input
                id="reag-hora"
                type="time"
                step="60"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <p className="text-xs text-muted-foreground">
            Avaliação online com o Dr. Lucas — duração fixa de 1h.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSalvar} disabled={salvando}>
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar nova data"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
