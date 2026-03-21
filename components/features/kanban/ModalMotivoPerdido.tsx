"use client"

import { useState } from "react"
import { XCircle, MessageSquare } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ModalMotivoPerdidoProps {
  aberto: boolean
  onFechar: () => void
  onConfirmar: (motivo: string) => void
  nomeLead: string
}

export function ModalMotivoPerdido({
  aberto,
  onFechar,
  onConfirmar,
  nomeLead,
}: ModalMotivoPerdidoProps) {
  const [motivo, setMotivo] = useState("")

  function handleConfirmar() {
    if (motivo.trim().length < 3) return
    onConfirmar(motivo.trim())
    setMotivo("")
  }

  function handleFechar() {
    setMotivo("")
    onFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && handleFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" />Mover para Perdido</DialogTitle>
          <DialogDescription>
            Informe o motivo da perda do lead <strong>{nomeLead}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label htmlFor="motivoPerda" className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-muted-foreground" />Motivo da perda</Label>
          <Textarea
            id="motivoPerda"
            placeholder="Ex: Paciente optou por outra clínica..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleFechar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmar}
            disabled={motivo.trim().length < 3}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
