"use client"

import { forwardRef, useImperativeHandle, useState } from "react"
import { MoreHorizontal, Pencil, EyeOff, Eye, Trash2, Film, ImageIcon, Ban, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DataTable, type ColunaConfig, type AcaoEmMassa } from "@/components/features/shared/DataTable"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { MidiaMarketingForm } from "@/components/features/midia-marketing/MidiaMarketingForm"
import { useMidiaMarketing } from "@/hooks/use-midia-marketing"

interface MidiaMarketing {
  id: string
  descricao: string
  url: string
  ativo: boolean
  criadoEm: string
}

function ehVideo(url: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(url)
}

export interface MidiaMarketingSecaoHandle {
  abrirNovo: () => void
}

export const MidiaMarketingSecao = forwardRef<MidiaMarketingSecaoHandle>(
  function MidiaMarketingSecao(_, ref) {
  const [busca, setBusca] = useState("")
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<MidiaMarketing | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<MidiaMarketing | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<MidiaMarketing | null>(null)
  const [preview, setPreview] = useState<MidiaMarketing | null>(null)

  useImperativeHandle(ref, () => ({
    abrirNovo: () => {
      setEditando(null)
      setFormAberto(true)
    },
  }))

  const { dados, carregando, erro, recarregar } = useMidiaMarketing({ busca })

  async function handleToggle() {
    if (!confirmToggle) return
    try {
      const res = await fetch(`/api/midia-marketing/${confirmToggle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !confirmToggle.ativo }),
      })
      if (!res.ok) throw new Error()
      toast.success(confirmToggle.ativo ? "Mídia desativada" : "Mídia ativada")
      recarregar()
    } catch {
      toast.error("Erro ao atualizar")
    } finally {
      setConfirmToggle(null)
    }
  }

  async function handleExcluir() {
    if (!confirmExcluir) return
    try {
      const res = await fetch(`/api/midia-marketing/${confirmExcluir.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("Mídia removida")
      recarregar()
    } catch {
      toast.error("Erro ao remover")
    } finally {
      setConfirmExcluir(null)
    }
  }

  async function executarBatch(acao: "ativar" | "desativar" | "excluir", ids: string[]) {
    try {
      const res = await fetch("/api/midia-marketing/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, acao }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro na operação")
      const verbo = acao === "excluir" ? "excluída(s)" : acao === "ativar" ? "ativada(s)" : "desativada(s)"
      toast.success(`${data.sucesso} de ${data.total} mídia(s) ${verbo}`)
      recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na operação")
    }
  }

  const acoesEmMassa: AcaoEmMassa[] = [
    {
      label: "Ativar",
      icone: <CheckCircle2 className="h-4 w-4" />,
      onClick: (ids) => executarBatch("ativar", ids),
    },
    {
      label: "Desativar",
      icone: <Ban className="h-4 w-4" />,
      onClick: (ids) => executarBatch("desativar", ids),
      confirmacao: {
        titulo: "Desativar mídias?",
        descricao: (qtd) => `${qtd} mídia(s) não serão mais enviadas pela Ana Júlia.`,
        textoBotao: "Desativar",
      },
    },
    {
      label: "Excluir",
      icone: <Trash2 className="h-4 w-4" />,
      variante: "destrutivo",
      onClick: (ids) => executarBatch("excluir", ids),
      confirmacao: {
        titulo: "Excluir mídias?",
        descricao: (qtd) => `${qtd} mídia(s) serão removidas permanentemente (soft-delete).`,
        textoBotao: "Excluir",
      },
    },
  ]

  const colunas: ColunaConfig<MidiaMarketing>[] = [
    {
      chave: "tipo" as keyof MidiaMarketing,
      titulo: "",
      classesCelula: "w-10",
      renderizar: (m) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setPreview(m)
          }}
          className="rounded p-1 hover:bg-muted transition-colors"
          title="Ver preview"
        >
          {ehVideo(m.url) ? (
            <Film className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      ),
    },
    {
      chave: "descricao",
      titulo: "Descrição",
      renderizar: (m) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setPreview(m)
          }}
          className="block w-full text-left text-sm hover:underline line-clamp-2 break-words pr-4"
        >
          {m.descricao}
        </button>
      ),
    },
    {
      chave: "ativo",
      titulo: "Status",
      classesCelula: "w-24 whitespace-nowrap",
      renderizar: (m) => (
        <Badge variant={m.ativo ? "default" : "secondary"}>
          {m.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      chave: "acoes" as keyof MidiaMarketing,
      titulo: "",
      classesCelula: "w-10",
      renderizar: (m) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditando(m); setFormAberto(true) }}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmToggle(m)}>
              {m.ativo ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {m.ativo ? "Desativar" : "Ativar"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setConfirmExcluir(m)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div>
      {carregando ? (
        <SkeletonTabela linhas={5} />
      ) : erro ? (
        <ErrorState mensagem={erro} onTentar={recarregar} />
      ) : dados.length === 0 && !busca ? (
        <EmptyState
          titulo="Nenhuma mídia cadastrada"
          descricao="Cadastre fotos e vídeos com descrição detalhada — a IA usa a descrição para escolher qual enviar ao paciente."
          textoBotao="Nova Mídia"
          onAcao={() => { setEditando(null); setFormAberto(true) }}
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
          selecionavel
          acoesEmMassa={acoesEmMassa}
          filtros={
            <Input
              placeholder="Buscar por descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-sm"
            />
          }
        />
      )}

      <MidiaMarketingForm
        aberto={formAberto}
        onFechar={() => { setFormAberto(false); setEditando(null) }}
        onSalvo={recarregar}
        registro={editando}
      />

      <ConfirmDialog
        titulo={confirmToggle?.ativo ? "Desativar mídia" : "Ativar mídia"}
        descricao={`Tem certeza que deseja ${confirmToggle?.ativo ? "desativar" : "ativar"} essa mídia?`}
        aberto={!!confirmToggle}
        onFechar={() => setConfirmToggle(null)}
        onConfirmar={handleToggle}
        textoBotao={confirmToggle?.ativo ? "Desativar" : "Ativar"}
      />

      <ConfirmDialog
        titulo="Excluir mídia"
        descricao="Tem certeza que deseja excluir essa mídia?"
        aberto={!!confirmExcluir}
        onFechar={() => setConfirmExcluir(null)}
        onConfirmar={handleExcluir}
        variante="destrutivo"
        textoBotao="Excluir"
      />

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-3xl border-none bg-background/95 p-4">
          <DialogTitle className="sr-only">Preview</DialogTitle>
          {preview && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{preview.descricao}</p>
              {ehVideo(preview.url) ? (
                <video
                  src={preview.url}
                  controls
                  className="max-h-[75vh] w-full rounded-lg"
                />
              ) : (
                <img
                  src={preview.url}
                  alt={preview.descricao}
                  className="max-h-[75vh] w-full rounded-lg object-contain"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
})
