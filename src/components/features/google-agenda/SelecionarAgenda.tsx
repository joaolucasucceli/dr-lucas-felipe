"use client"

import { useEffect, useState, useCallback } from "react"
import { Calendar, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Agenda {
  id: string
  nome: string
  primary: boolean
  descricao: string | null
}

interface SelecionarAgendaProps {
  calendarIdAtual: string | null
  onSalvo: () => void
}

export function SelecionarAgenda({ calendarIdAtual, onSalvo }: SelecionarAgendaProps) {
  const [agendas, setAgendas] = useState<Agenda[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [selecionada, setSelecionada] = useState<string>(
    calendarIdAtual ?? ""
  )

  const buscar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch("/api/configuracoes/google-agenda/calendarios")
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao listar agendas")
      }
      const json = await res.json()
      setAgendas(json.agendas)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao listar agendas")
      setAgendas([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscar()
  }, [buscar])

  useEffect(() => {
    setSelecionada(calendarIdAtual ?? "")
  }, [calendarIdAtual])

  async function handleSalvar() {
    if (!selecionada) {
      toast.error("Selecione uma agenda")
      return
    }
    setSalvando(true)
    try {
      const res = await fetch(
        "/api/configuracoes/google-agenda/calendarios",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ calendarId: selecionada }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao salvar agenda")
      }
      toast.success("Agenda atualizada — Ana Júlia já está usando")
      onSalvo()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSalvando(false)
    }
  }

  const agendaAtual = agendas?.find((a) => a.id === calendarIdAtual)
  const mudouEscolha = selecionada !== (calendarIdAtual ?? "")

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm">Agenda do Google usada pela Ana Júlia</Label>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando agendas...
        </div>
      ) : agendas && agendas.length > 0 ? (
        <>
          <Select value={selecionada} onValueChange={setSelecionada}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma agenda" />
            </SelectTrigger>
            <SelectContent>
              {agendas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome}
                  {a.primary && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (principal)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground">
            {agendaAtual ? (
              <>
                A Ana Júlia cria eventos em{" "}
                <strong className="text-foreground">{agendaAtual.nome}</strong>.
                Trocar aqui afeta apenas eventos novos — os existentes ficam onde
                foram criados.
              </>
            ) : calendarIdAtual ? (
              <>Agenda atual: <code className="text-[11px]">{calendarIdAtual}</code></>
            ) : (
              <>Nenhuma agenda escolhida — Ana Júlia está usando a agenda principal.</>
            )}
          </p>

          {mudouEscolha && (
            <div className="flex justify-end">
              <Button onClick={handleSalvar} disabled={salvando} size="sm">
                {salvando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar agenda"
                )}
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma agenda encontrada na conta Google conectada.
        </p>
      )}
    </div>
  )
}
