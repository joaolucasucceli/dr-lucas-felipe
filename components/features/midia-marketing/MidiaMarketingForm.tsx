"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { criarMidiaMarketingSchema, CATEGORIAS_MIDIA, TIPOS_MIDIA } from "@/lib/validations/midia-marketing"
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

export function MidiaMarketingForm({ aberto, onFechar, onSalvo, registro }: Props) {
  const editando = !!registro
  const [procedimentos, setProcedimentos] = useState<Array<{ id: string; nome: string }>>([])

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

  async function onSubmit(data: FormData) {
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
            <Label>URL da mídia</Label>
            <Input {...form.register("url")} placeholder="/videos/reel-01.mp4 ou https://..." />
          </div>

          {form.watch("url") && (
            <div className="rounded-md border p-2">
              {form.watch("tipo") === "imagem" ? (
                <img src={form.watch("url")} alt="Preview" className="max-h-40 rounded object-contain" />
              ) : (
                <video src={form.watch("url")} controls className="max-h-40 w-full rounded" />
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit">{editando ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
