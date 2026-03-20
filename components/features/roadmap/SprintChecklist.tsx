"use client"

import { useState } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { SprintItem } from "@/hooks/use-sprints"

interface SprintChecklistProps {
  sprintId: string
  itens: SprintItem[]
  onAtualizar: () => void
}

export function SprintChecklist({ sprintId, itens, onAtualizar }: SprintChecklistProps) {
  const [novoTitulo, setNovoTitulo] = useState("")
  const [adicionando, setAdicionando] = useState(false)
  const [toggleIds, setToggleIds] = useState<Set<string>>(new Set())

  async function handleAdicionarItem() {
    if (!novoTitulo.trim()) return
    setAdicionando(true)

    try {
      const res = await fetch(`/api/sprints/${sprintId}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: novoTitulo.trim() }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao adicionar item")
        return
      }

      setNovoTitulo("")
      onAtualizar()
    } catch {
      toast.error("Erro ao adicionar item")
    } finally {
      setAdicionando(false)
    }
  }

  async function handleToggle(item: SprintItem) {
    setToggleIds((prev) => new Set(prev).add(item.id))

    try {
      const res = await fetch(`/api/sprints/${sprintId}/itens/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concluido: !item.concluido }),
      })

      if (!res.ok) {
        toast.error("Erro ao atualizar item")
        return
      }

      onAtualizar()
    } catch {
      toast.error("Erro ao atualizar item")
    } finally {
      setToggleIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  async function handleDeletar(itemId: string) {
    try {
      const res = await fetch(`/api/sprints/${sprintId}/itens/${itemId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        toast.error("Erro ao remover item")
        return
      }

      onAtualizar()
    } catch {
      toast.error("Erro ao remover item")
    }
  }

  const concluidos = itens.filter((i) => i.concluido).length

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {concluidos}/{itens.length} concluídos
      </p>

      <div className="space-y-2">
        {itens.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <Checkbox
              checked={item.concluido}
              disabled={toggleIds.has(item.id)}
              onCheckedChange={() => handleToggle(item)}
            />
            <span
              className={`flex-1 text-sm ${item.concluido ? "line-through text-muted-foreground" : ""}`}
            >
              {item.titulo}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDeletar(item.id)}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          handleAdicionarItem()
        }}
      >
        <Input
          placeholder="Novo item..."
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8" disabled={adicionando}>
          {adicionando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
      </form>
    </div>
  )
}
