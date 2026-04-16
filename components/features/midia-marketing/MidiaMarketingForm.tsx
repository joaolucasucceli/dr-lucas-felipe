"use client"

import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Upload, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { criarMidiaMarketingSchema, CATEGORIAS_MIDIA, TIPOS_MIDIA } from "@/lib/validations/midia-marketing"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { z } from "zod"

type FormData = z.infer<typeof criarMidiaMarketingSchema>

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  registro?: {
    id: string
    titulo: string
    descricao: string | null
    categoria: string
    procedimento: string | null
    url: string
    tipo: string
    ordem: number
    ativo: boolean
  } | null
}

const CATEGORIA_LABELS: Record<string, string> = {
  reels: "Reels (Instagram)",
  "antes-depois": "Antes e Depois",
  depoimento: "Depoimento",
  procedimento: "Procedimento",
}

const BUCKET = "atendimento-midias"

export function MidiaMarketingForm({ aberto, onFechar, onSalvo, registro }: Props) {
  const editando = !!registro
  const [procedimentos, setProcedimentos] = useState<Array<{ id: string; nome: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(criarMidiaMarketingSchema) as never,
    defaultValues: {
      titulo: "",
      descricao: "",
      categoria: "reels",
      procedimento: "",
      url: "",
      tipo: "video",
      ordem: 0,
      ativo: true,
    },
  })

  useEffect(() => {
    fetch("/api/procedimentos?ativo=true")
      .then((r) => r.json())
      .then((j) => setProcedimentos(j.dados || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (aberto && registro) {
      form.reset({
        titulo: registro.titulo,
        descricao: registro.descricao || "",
        categoria: registro.categoria as FormData["categoria"],
        procedimento: registro.procedimento || "",
        url: registro.url,
        tipo: registro.tipo as FormData["tipo"],
        ordem: registro.ordem,
        ativo: registro.ativo,
      })
    } else if (aberto) {
      form.reset({
        titulo: "",
        descricao: "",
        categoria: "reels",
        procedimento: "",
        url: "",
        tipo: "video",
        ordem: 0,
        ativo: true,
      })
    }
  }, [aberto, registro, form])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo excede 20MB")
      return
    }

    setUploading(true)
    setProgresso(0)

    try {
      const supabase = getSupabaseBrowser()
      const ext = file.name.split(".").pop() || "bin"
      const path = `midia-marketing/${Date.now()}.${ext}`

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      form.setValue("url", data.publicUrl)

      const isVideo = file.type.startsWith("video/")
      form.setValue("tipo", isVideo ? "video" : "imagem")

      setProgresso(100)
      toast.success("Arquivo enviado")
    } catch (err) {
      toast.error("Erro ao enviar arquivo")
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: FormData) {
    if (!data.url) {
      toast.error("Envie um arquivo primeiro")
      return
    }
    try {
      const url = editando
        ? `/api/midia-marketing/${registro!.id}`
        : "/api/midia-marketing"
      const res = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success(editando ? "Mídia atualizada" : "Mídia criada")
      onSalvo()
      onFechar()
    } catch {
      toast.error("Erro ao salvar")
    }
  }

  const categoriaAtual = form.watch("categoria")
  const urlAtual = form.watch("url")
  const tipoAtual = form.watch("tipo")

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar Mídia" : "Nova Mídia"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label>Título</Label>
            <Input {...form.register("titulo")} placeholder="Ex: Resultado Mini Lipo — Paciente #5" />
          </div>

          <div className="grid gap-2">
            <Label>Descrição (opcional)</Label>
            <Textarea {...form.register("descricao")} rows={2} placeholder="Breve descrição da mídia" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={form.watch("categoria")}
                onValueChange={(v) => form.setValue("categoria", v as FormData["categoria"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_MIDIA.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch("tipo")}
                onValueChange={(v) => form.setValue("tipo", v as FormData["tipo"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_MIDIA.map((t) => (
                    <SelectItem key={t} value={t}>{t === "imagem" ? "Imagem" : "Vídeo"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(categoriaAtual === "antes-depois" || categoriaAtual === "procedimento") && (
            <div className="grid gap-2">
              <Label>Procedimento associado</Label>
              <Select
                value={form.watch("procedimento") || "nenhum"}
                onValueChange={(v) => form.setValue("procedimento", v === "nenhum" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {procedimentos.map((p) => (
                    <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Arquivo</Label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full justify-center gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : urlAtual ? "Trocar arquivo" : "Enviar arquivo"}
            </Button>
            {uploading && <Progress value={progresso} className="h-1" />}
          </div>

          {urlAtual && (
            <div className="rounded-md border p-2">
              {tipoAtual === "imagem" ? (
                <img src={urlAtual} alt="Preview" className="max-h-48 w-full rounded object-contain" />
              ) : (
                <video src={urlAtual} controls className="max-h-48 w-full rounded" />
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading || !urlAtual}>
              {editando ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
