"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { FormDialog } from "@/components/features/shared/FormDialog"
import { criarMidiaMarketingSchema } from "@/lib/validations/midia-marketing"
import type { z } from "zod"

type FormData = z.infer<typeof criarMidiaMarketingSchema>

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  registro?: {
    id: string
    descricao: string
    url: string
  } | null
}

function inferirTipoArquivo(url: string): "imagem" | "video" {
  return /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(url) ? "video" : "imagem"
}

export function MidiaMarketingForm({ aberto, onFechar, onSalvo, registro }: Props) {
  const editando = !!registro
  const [uploading, setUploading] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(criarMidiaMarketingSchema) as never,
    defaultValues: { descricao: "", url: "" },
  })

  useEffect(() => {
    if (aberto && registro) {
      form.reset({ descricao: registro.descricao, url: registro.url })
    } else if (aberto) {
      form.reset({ descricao: "", url: "" })
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
      const formData = new FormData()
      formData.append("arquivo", file)

      const res = await fetch("/api/midia-marketing/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }))
        toast.error(err.error || "Falha no upload")
        return
      }

      const { url } = await res.json()
      form.setValue("url", url)

      setProgresso(100)
      toast.success("Arquivo enviado")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      toast.error(`Erro ao enviar arquivo: ${msg}`)
      console.error("[upload] exception:", err)
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: FormData) {
    if (!data.url) {
      toast.error("Anexe um arquivo primeiro")
      return
    }
    try {
      const url = editando ? `/api/midia-marketing/${registro!.id}` : "/api/midia-marketing"
      const res = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao salvar")
      }
      toast.success(editando ? "Mídia atualizada" : "Mídia criada")
      onSalvo()
      onFechar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar")
    }
  }

  const urlAtual = form.watch("url")
  const tipoInferido = urlAtual ? inferirTipoArquivo(urlAtual) : null

  return (
    <FormDialog
      aberto={aberto}
      onFechar={onFechar}
      titulo="Mídia"
      editando={editando}
      isSubmitting={form.formState.isSubmitting}
      onSubmit={form.handleSubmit(onSubmit)}
      largura="md"
      desabilitarSalvar={uploading || !urlAtual}
    >
      <div className="grid gap-2">
        <Label>
          Descrição
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (usada pela IA para escolher qual mídia enviar)
          </span>
        </Label>
        <Textarea
          {...form.register("descricao")}
          rows={5}
          placeholder="Ex: Resultado de Mini Lipo em paciente feminina, sobrepeso, região abdominal, aos 6 meses. Abdome plano, cintura definida. Ideal para pacientes que querem eliminar gordura localizada."
        />
        {form.formState.errors.descricao && (
          <p className="text-xs text-destructive">{form.formState.errors.descricao.message}</p>
        )}
      </div>

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
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Enviando..." : urlAtual ? "Trocar arquivo" : "Anexar imagem ou vídeo"}
        </Button>
        {uploading && <Progress value={progresso} className="h-1" />}
      </div>

      {urlAtual && (
        <div className="rounded-md border p-2">
          {tipoInferido === "imagem" ? (
            <Image
              src={urlAtual}
              alt="Preview"
              width={400}
              height={192}
              className="max-h-48 w-full rounded object-contain"
              unoptimized
            />
          ) : (
            <video src={urlAtual} controls className="max-h-48 w-full rounded" />
          )}
        </div>
      )}
    </FormDialog>
  )
}
