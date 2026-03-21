"use client"

import { useState, useRef } from "react"
import { Upload, X, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"

interface FotoLead {
  id: string
  url: string
  descricao: string | null
  tipoAnalise: string | null
  criadoEm: string
}

interface GaleriaFotosProps {
  leadId: string
  fotosIniciais: FotoLead[]
  isGestor: boolean
}

const TIPOS = [
  { valor: "antes", label: "Antes", cor: "bg-blue-500/90 text-white" },
  { valor: "depois", label: "Depois", cor: "bg-green-500/90 text-white" },
  { valor: "geral", label: "Geral", cor: "" },
]

function badgeClasses(tipo: string | null) {
  if (tipo === "antes") return "bg-blue-500/90 text-white border-0"
  if (tipo === "depois") return "bg-green-500/90 text-white border-0"
  return ""
}

export function GaleriaFotos({ leadId, fotosIniciais, isGestor }: GaleriaFotosProps) {
  const [fotos, setFotos] = useState<FotoLead[]>(fotosIniciais)

  // Upload dialog
  const [abrirUpload, setAbrirUpload] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("antes")
  const [descricao, setDescricao] = useState("")
  const [uploadando, setUploadando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Lightbox
  const [fotoAmpliada, setFotoAmpliada] = useState<{ foto: FotoLead; secao: FotoLead[] } | null>(null)

  // Exclusão
  const [confirmFoto, setConfirmFoto] = useState<string | null>(null)
  const [deletando, setDeletando] = useState(false)

  const fotosAntes = fotos.filter((f) => f.tipoAnalise === "antes")
  const fotosDepois = fotos.filter((f) => f.tipoAnalise === "depois")
  const fotosGeral = fotos.filter((f) => f.tipoAnalise !== "antes" && f.tipoAnalise !== "depois")

  function abrirDialogUpload() {
    setArquivo(null)
    setTipoSelecionado("antes")
    setDescricao("")
    setAbrirUpload(true)
  }

  async function handleUpload() {
    if (!arquivo) {
      toast.error("Selecione uma imagem")
      return
    }

    setUploadando(true)
    const formData = new FormData()
    formData.append("arquivo", arquivo)
    formData.append("tipoAnalise", tipoSelecionado)
    if (descricao.trim()) formData.append("descricao", descricao.trim())

    try {
      const res = await fetch(`/api/leads/${leadId}/fotos`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Erro ao enviar foto")
        return
      }
      const novaFoto: FotoLead = await res.json()
      setFotos((prev) => [novaFoto, ...prev])
      toast.success("Foto enviada")
      setAbrirUpload(false)
    } catch {
      toast.error("Erro ao enviar foto")
    } finally {
      setUploadando(false)
    }
  }

  async function handleDeletar(fotoId: string) {
    setDeletando(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/fotos/${fotoId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setFotos((prev) => prev.filter((f) => f.id !== fotoId))
      if (fotoAmpliada?.foto.id === fotoId) setFotoAmpliada(null)
      toast.success("Foto removida")
      setConfirmFoto(null)
    } catch {
      toast.error("Erro ao remover foto")
    } finally {
      setDeletando(false)
    }
  }

  function navLightbox(direcao: 1 | -1) {
    if (!fotoAmpliada) return
    const { secao, foto } = fotoAmpliada
    const idx = secao.findIndex((f) => f.id === foto.id)
    const proximo = secao[idx + direcao]
    if (proximo) setFotoAmpliada({ foto: proximo, secao })
  }

  function CardFoto({ foto, secao }: { foto: FotoLead; secao: FotoLead[] }) {
    return (
      <div
        className="group relative overflow-hidden rounded-lg border cursor-pointer"
        onClick={() => setFotoAmpliada({ foto, secao })}
      >
        <img
          src={foto.url}
          alt={foto.descricao || "Foto do lead"}
          className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
        />
        {foto.tipoAnalise && foto.tipoAnalise !== "geral" && (
          <Badge className={`absolute left-2 top-2 text-[10px] uppercase ${badgeClasses(foto.tipoAnalise)}`}>
            {foto.tipoAnalise}
          </Badge>
        )}
        {isGestor && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setConfirmFoto(foto.id)
            }}
            className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {foto.descricao && (
          <p className="p-2 text-xs text-muted-foreground line-clamp-1">{foto.descricao}</p>
        )}
      </div>
    )
  }

  function Secao({ titulo, lista, cor }: { titulo: string; lista: FotoLead[]; cor?: string }) {
    if (lista.length === 0) return null
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{titulo}</h3>
          <Badge variant="secondary" className="text-xs">{lista.length}</Badge>
          {cor && <div className={`h-2 w-2 rounded-full ${cor}`} />}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {lista.map((foto) => (
            <CardFoto key={foto.id} foto={foto} secao={lista} />
          ))}
        </div>
      </div>
    )
  }

  const temFotos = fotos.length > 0

  return (
    <div className="space-y-6">
      <div>
        <Button onClick={abrirDialogUpload} size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Enviar Foto
        </Button>
      </div>

      {!temFotos ? (
        <EmptyState
          icone={<ImageIcon className="h-12 w-12" />}
          titulo="Nenhuma foto"
          descricao="Envie fotos da paciente para acompanhamento antes/depois."
        />
      ) : (
        <div className="space-y-8">
          <Secao titulo="Antes" lista={fotosAntes} cor="bg-blue-500" />
          <Secao titulo="Depois" lista={fotosDepois} cor="bg-green-500" />
          <Secao titulo="Geral" lista={fotosGeral} />
        </div>
      )}

      {/* Dialog de upload */}
      <Dialog open={abrirUpload} onOpenChange={setAbrirUpload}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar Foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Imagem</Label>
              <Input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP — máx. 10 MB</p>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Pré-operatório, semana 4..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbrirUpload(false)} disabled={uploadando}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={uploadando || !arquivo}>
              {uploadando ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!fotoAmpliada} onOpenChange={(open) => !open && setFotoAmpliada(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {fotoAmpliada && (
            <div className="relative bg-black">
              <img
                src={fotoAmpliada.foto.url}
                alt={fotoAmpliada.foto.descricao || "Foto ampliada"}
                className="max-h-[80vh] w-full object-contain"
              />
              {/* Navegação */}
              {fotoAmpliada.secao.findIndex((f) => f.id === fotoAmpliada.foto.id) > 0 && (
                <button
                  onClick={() => navLightbox(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {fotoAmpliada.secao.findIndex((f) => f.id === fotoAmpliada.foto.id) <
                fotoAmpliada.secao.length - 1 && (
                <button
                  onClick={() => navLightbox(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              {/* Rodapé */}
              {(fotoAmpliada.foto.descricao || fotoAmpliada.foto.criadoEm) && (
                <div className="bg-black/70 px-4 py-2 text-sm text-white">
                  {fotoAmpliada.foto.descricao && (
                    <p>{fotoAmpliada.foto.descricao}</p>
                  )}
                  <p className="text-xs text-white/60">
                    {new Date(fotoAmpliada.foto.criadoEm).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm exclusão */}
      <ConfirmDialog
        titulo="Excluir foto"
        descricao="Tem certeza que deseja excluir esta foto? A ação não pode ser desfeita."
        aberto={!!confirmFoto}
        onFechar={() => setConfirmFoto(null)}
        onConfirmar={() => confirmFoto && handleDeletar(confirmFoto)}
        variante="destrutivo"
        textoBotao="Excluir"
        carregando={deletando}
      />
    </div>
  )
}
