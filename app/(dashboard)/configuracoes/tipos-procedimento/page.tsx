"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Plus, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { DataTable, type ColunaConfig } from "@/components/features/shared/DataTable"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ErrorState } from "@/components/features/shared/ErrorState"

interface TipoProcedimento {
  id: string
  nome: string
  ativo: boolean
  criadoEm: string
}

export default function TiposProcedimentoPage() {
  const { data: session } = useSession()
  const isGestor = session?.user?.perfil === "gestor"

  const [dados, setDados] = useState<TipoProcedimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<TipoProcedimento | null>(null)
  const [nomeForm, setNomeForm] = useState("")
  const [salvando, setSalvando] = useState(false)

  const [confirmAberto, setConfirmAberto] = useState(false)
  const [alvo, setAlvo] = useState<TipoProcedimento | null>(null)
  const [confirmTipo, setConfirmTipo] = useState<"toggle" | "delete">("toggle")

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch("/api/tipos-procedimento")
      if (!res.ok) throw new Error("Erro ao carregar tipos")
      const json = await res.json()
      setDados(json.dados)
    } catch {
      setErro("Não foi possível carregar os tipos de procedimento.")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrirNovoForm() {
    setEditando(null)
    setNomeForm("")
    setFormAberto(true)
  }

  function abrirEditarForm(tipo: TipoProcedimento) {
    setEditando(tipo)
    setNomeForm(tipo.nome)
    setFormAberto(true)
  }

  function fecharForm() {
    setFormAberto(false)
    setEditando(null)
    setNomeForm("")
  }

  async function handleSalvar() {
    if (!nomeForm.trim() || nomeForm.trim().length < 2) {
      toast.error("Nome deve ter pelo menos 2 caracteres")
      return
    }

    setSalvando(true)
    try {
      const url = editando ? `/api/tipos-procedimento/${editando.id}` : "/api/tipos-procedimento"
      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeForm.trim() }),
      })

      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || "Erro ao salvar tipo")
        return
      }

      toast.success(editando ? "Tipo atualizado" : "Tipo criado")
      fecharForm()
      carregar()
    } catch {
      toast.error("Erro ao salvar tipo")
    } finally {
      setSalvando(false)
    }
  }

  function handleToggleAtivo(tipo: TipoProcedimento) {
    setAlvo(tipo)
    setConfirmTipo("toggle")
    setConfirmAberto(true)
  }

  function handleDelete(tipo: TipoProcedimento) {
    setAlvo(tipo)
    setConfirmTipo("delete")
    setConfirmAberto(true)
  }

  async function confirmarAcao() {
    if (!alvo) return

    try {
      if (confirmTipo === "toggle") {
        const res = await fetch(`/api/tipos-procedimento/${alvo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ativo: !alvo.ativo }),
        })
        if (!res.ok) {
          const json = await res.json()
          toast.error(json.error || "Erro ao atualizar tipo")
          return
        }
        toast.success(alvo.ativo ? "Tipo desativado" : "Tipo ativado")
      } else {
        const res = await fetch(`/api/tipos-procedimento/${alvo.id}`, { method: "DELETE" })
        if (!res.ok) {
          const json = await res.json()
          toast.error(json.error || "Erro ao excluir tipo")
          return
        }
        toast.success("Tipo excluído")
      }

      carregar()
    } catch {
      toast.error("Erro ao executar ação")
    } finally {
      setConfirmAberto(false)
      setAlvo(null)
    }
  }

  const colunas: ColunaConfig<TipoProcedimento>[] = [
    {
      chave: "nome",
      titulo: "Nome",
      ordenavel: true,
    },
    {
      chave: "ativo",
      titulo: "Status",
      renderizar: (t) => (
        <Badge variant={t.ativo ? "default" : "secondary"}>
          {t.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      chave: "criadoEm",
      titulo: "Criado em",
      classesCelula: "hidden sm:table-cell",
      renderizar: (t) => new Date(t.criadoEm).toLocaleDateString("pt-BR"),
    },
    ...(isGestor
      ? [
          {
            chave: "acoes" as keyof TipoProcedimento,
            titulo: "",
            renderizar: (t: TipoProcedimento) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => abrirEditarForm(t)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleAtivo(t)}>
                    {t.ativo ? (
                      <>
                        <ToggleLeft className="mr-2 h-4 w-4" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <ToggleRight className="mr-2 h-4 w-4" />
                        Ativar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDelete(t)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColunaConfig<TipoProcedimento>,
        ]
      : []),
  ]

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Tipos de Procedimento" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={carregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Tipos de Procedimento"
        descricao="Categorias personalizáveis utilizadas nos procedimentos"
      >
        {isGestor && (
          <Button onClick={abrirNovoForm}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Tipo
          </Button>
        )}
      </PageHeader>

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={3} colunas={3} />
        ) : !carregando && dados.length === 0 ? (
          <EmptyState
            titulo="Nenhum tipo cadastrado"
            descricao="Adicione categorias para organizar os procedimentos."
            textoBotao={isGestor ? "Novo Tipo" : undefined}
            onAcao={isGestor ? abrirNovoForm : undefined}
          />
        ) : (
          <DataTable
            colunas={colunas}
            dados={dados}
            total={dados.length}
            pagina={1}
            porPagina={dados.length || 10}
            onPaginaChange={() => {}}
            carregando={carregando}
          />
        )}
      </div>

      <Dialog open={formAberto} onOpenChange={(open) => { if (!open) fecharForm() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Tipo" : "Novo Tipo de Procedimento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tipo-nome">Nome</Label>
              <Input
                id="tipo-nome"
                value={nomeForm}
                onChange={(e) => setNomeForm(e.target.value)}
                placeholder="ex: Cirúrgico"
                onKeyDown={(e) => { if (e.key === "Enter") handleSalvar() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharForm}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        titulo={
          confirmTipo === "delete"
            ? "Excluir tipo"
            : alvo?.ativo
            ? "Desativar tipo"
            : "Ativar tipo"
        }
        descricao={
          confirmTipo === "delete"
            ? `Tem certeza que deseja excluir "${alvo?.nome}"? Esta ação não pode ser desfeita.`
            : alvo?.ativo
            ? `Desativar "${alvo?.nome}"? O tipo não aparecerá mais no formulário de procedimentos.`
            : `Reativar "${alvo?.nome}"?`
        }
        aberto={confirmAberto}
        onFechar={() => { setConfirmAberto(false); setAlvo(null) }}
        onConfirmar={confirmarAcao}
        variante={confirmTipo === "delete" ? "destrutivo" : "padrao"}
        textoBotao={confirmTipo === "delete" ? "Excluir" : alvo?.ativo ? "Desativar" : "Ativar"}
      />
    </div>
  )
}
