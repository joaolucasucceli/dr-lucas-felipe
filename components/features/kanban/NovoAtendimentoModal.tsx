"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/features/shared/StatusBadge"

interface LeadBusca {
  id: string
  nome: string
  whatsapp: string
  statusFunil: string
}

interface NovoAtendimentoModalProps {
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function NovoAtendimentoModal({
  aberto,
  onFechar,
  onSucesso,
}: NovoAtendimentoModalProps) {
  const [busca, setBusca] = useState("")
  const [resultados, setResultados] = useState<LeadBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [leadSelecionado, setLeadSelecionado] = useState<LeadBusca | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!aberto) {
      setBusca("")
      setResultados([])
      setLeadSelecionado(null)
    }
  }, [aberto])

  useEffect(() => {
    if (!busca.trim()) {
      setResultados([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/leads?busca=${encodeURIComponent(busca)}&arquivado=false`)
        const data = await res.json()
        setResultados(data.dados?.slice(0, 8) || [])
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)
  }, [busca])

  async function handleConfirmar() {
    if (!leadSelecionado) return
    setConfirmando(true)
    try {
      const res = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: leadSelecionado.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar atendimento")
        return
      }
      toast.success("Novo ciclo de atendimento iniciado")
      onSucesso()
    } catch {
      toast.error("Erro ao criar atendimento")
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou WhatsApp..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setLeadSelecionado(null)
              }}
            />
          </div>

          {buscando && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!buscando && resultados.length > 0 && !leadSelecionado && (
            <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
              {resultados.map((lead) => (
                <button
                  key={lead.id}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                  onClick={() => setLeadSelecionado(lead)}
                >
                  <div>
                    <p className="font-medium">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground">{lead.whatsapp}</p>
                  </div>
                  <StatusBadge status={lead.statusFunil} />
                </button>
              ))}
            </div>
          )}

          {!buscando && busca.trim() && resultados.length === 0 && !leadSelecionado && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum lead encontrado
            </p>
          )}

          {leadSelecionado && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">{leadSelecionado.nome}</p>
              <p className="text-xs text-muted-foreground">{leadSelecionado.whatsapp}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status atual:</span>
                <StatusBadge status={leadSelecionado.statusFunil} />
              </div>
              <p className="text-xs text-muted-foreground">
                Um novo ciclo de atendimento será iniciado a partir de "Acolhimento".
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onFechar} disabled={confirmando}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={!leadSelecionado || confirmando}
            >
              {confirmando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
