"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Plus, MoreHorizontal, Pencil, EyeOff, Eye, Trash2, Film, ImageIcon } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { PageHeader } from "@/components/features/shared/PageHeader"
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

export default function MidiaMarketingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<MidiaMarketing | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<MidiaMarketing | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<MidiaMarketing | null>(null)
  const [preview, setPreview] = useState<MidiaMarketing | null>(null)

  const { dados, carregando, erro, recarregar } = useMidiaMarketing({ busca })

  const perfil = session?.user?.perfil
  if (perfil && perfil !== "gestor") {
    router.replace("/dashboard")
    return null
  }

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

  return (
    <div>
      <PageHeader
        titulo="Mídia Marketing"
        descricao="Catálogo de mídias que a IA envia. A escolha é feita pela descrição — quanto mais detalhada, melhor."
      >
        <Button onClick={() => { setEditando(null); setFormAberto(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Mídia
        </Button>
      </PageHeader>

      <div className="mt-6">
        <Input
          placeholder="Buscar por descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-4 max-w-sm"
        />

        {carregando ? (
          <SkeletonTabela linhas={5} />
        ) : erro ? (
          <ErrorState mensagem={erro} onTentar={recarregar} />
        ) : dados.length === 0 ? (
          <EmptyState
            titulo="Nenhuma mídia cadastrada"
            descricao="Cadastre fotos e vídeos com descrição detalhada — a IA usa a descrição para escolher qual enviar ao paciente."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-full">Descrição</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="w-10">
                      <button
                        type="button"
                        onClick={() => setPreview(m)}
                        className="rounded p-1 hover:bg-muted transition-colors"
                        title="Ver preview"
                      >
                        {ehVideo(m.url) ? (
                          <Film className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="min-w-0 max-w-0">
                      <button
                        type="button"
                        onClick={() => setPreview(m)}
                        className="block w-full text-left text-sm hover:underline line-clamp-2 break-words pr-4"
                      >
                        {m.descricao}
                      </button>
                    </TableCell>
                    <TableCell className="w-24 whitespace-nowrap">
                      <Badge variant={m.ativo ? "default" : "secondary"}>
                        {m.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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
}
