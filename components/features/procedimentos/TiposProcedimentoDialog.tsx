"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2, Tags } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TipoProcedimento {
  id: string
  nome: string
  ativo: boolean
}

interface Props {
  aberto: boolean
  onFechar: () => void
}

export function TiposProcedimentoDialog({ aberto, onFechar }: Props) {
  const [dados, setDados] = useState<TipoProcedimento[]>([])
  const [carregando, setCarregando] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoNome, setEditandoNome] = useState("")

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch("/api/tipos-procedimento")
      if (!res.ok) throw new Error()
      const json = await res.json()
      setDados(json.dados || [])
    } catch {
      toast.error("Erro ao carregar tipos")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (aberto) carregar()
  }, [aberto, carregar])

  async function handleCriar() {
    if (!novoNome.trim() || novoNome.trim().length < 2) return
    try {
      const res = await fetch("/api/tipos-procedimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome.trim() }),
      })
      if (!res.ok) {
        const j = await res.json()
        toast.error(j.error || "Erro")
        return
      }
      toast.success("Tipo criado")
      setNovoNome("")
      carregar()
    } catch {
      toast.error("Erro ao criar tipo")
    }
  }

  async function handleSalvarEdicao(id: string) {
    if (!editandoNome.trim() || editandoNome.trim().length < 2) return
    try {
      const res = await fetch(`/api/tipos-procedimento/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editandoNome.trim() }),
      })
      if (!res.ok) throw new Error()
      toast.success("Tipo atualizado")
      setEditandoId(null)
      carregar()
    } catch {
      toast.error("Erro ao salvar")
    }
  }

  async function handleToggle(t: TipoProcedimento) {
    try {
      await fetch(`/api/tipos-procedimento/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !t.ativo }),
      })
      toast.success(t.ativo ? "Desativado" : "Ativado")
      carregar()
    } catch {
      toast.error("Erro")
    }
  }

  async function handleExcluir(t: TipoProcedimento) {
    try {
      const res = await fetch(`/api/tipos-procedimento/${t.id}`, { method: "DELETE" })
      if (!res.ok) {
        const j = await res.json()
        toast.error(j.error || "Erro")
        return
      }
      toast.success("Tipo excluído")
      carregar()
    } catch {
      toast.error("Erro")
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Tipos de Procedimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Novo tipo..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriar()}
            />
            <Button size="sm" onClick={handleCriar} disabled={!novoNome.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {carregando ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : dados.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum tipo cadastrado.</p>
          ) : (
            <div className="space-y-1">
              {dados.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  {editandoId === t.id ? (
                    <>
                      <Input
                        value={editandoNome}
                        onChange={(e) => setEditandoNome(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSalvarEdicao(t.id)}
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSalvarEdicao(t.id)}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{t.nome}</span>
                      <Badge variant={t.ativo ? "default" : "secondary"} className="text-[10px]">
                        {t.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditandoId(t.id); setEditandoNome(t.nome) }}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(t)}>
                            {t.ativo ? <ToggleLeft className="mr-2 h-3.5 w-3.5" /> : <ToggleRight className="mr-2 h-3.5 w-3.5" />}
                            {t.ativo ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleExcluir(t)}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
