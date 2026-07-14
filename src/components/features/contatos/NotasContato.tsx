"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface NotasContatoProps {
  texto: string | null
  onAdicionar: (novaNota: string) => Promise<void>
}

export function NotasContato({ texto, onAdicionar }: NotasContatoProps) {
  const [novaNota, setNovaNota] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [aberto, setAberto] = useState(false)

  async function handleSalvar() {
    const conteudo = novaNota.trim()
    if (!conteudo) {
      setAberto(false)
      return
    }
    setSalvando(true)
    try {
      await onAdicionar(conteudo)
      setNovaNota("")
      setAberto(false)
      toast.success("Nota adicionada")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar nota")
    } finally {
      setSalvando(false)
    }
  }

  const notas = (texto ?? "")
    .split(/\n---\n/)
    .map((n) => n.trim())
    .filter(Boolean)
    .reverse()

  return (
    <div className="space-y-4">
      {notas.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhuma nota registrada ainda.</p>
      ) : (
        <div className="space-y-2">
          {notas.map((nota, i) => (
            <div
              key={i}
              className="rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap text-foreground/90"
            >
              {nota}
            </div>
          ))}
        </div>
      )}

      {aberto ? (
        <div className="space-y-2">
          <Textarea
            value={novaNota}
            onChange={(e) => setNovaNota(e.target.value)}
            placeholder="Escreva uma observação. As notas são acumulativas e separadas por divisor."
            rows={4}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNovaNota("")
                setAberto(false)
              }}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSalvar} disabled={salvando || !novaNota.trim()}>
              {salvando && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Adicionar nota
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAberto(true)} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Adicionar nota
        </Button>
      )}
    </div>
  )
}
