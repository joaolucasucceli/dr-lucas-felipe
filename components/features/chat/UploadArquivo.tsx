"use client"

import { useState, useRef, useCallback, type DragEvent } from "react"
import { X, Upload, Loader2, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { uploadArquivo, validarArquivo, detectarTipoMidia } from "@/lib/supabase-storage"
import { toast } from "sonner"

interface UploadArquivoProps {
  conversaId: string
  onEnviado: (url: string, tipo: string, nomeArquivo: string) => void
  onFechar: () => void
}

export function UploadArquivo({ conversaId, onEnviado, onFechar }: UploadArquivoProps) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progresso, setProgresso] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selecionarArquivo = useCallback((file: File) => {
    const erro = validarArquivo(file)
    if (erro) {
      toast.error(erro)
      return
    }
    setArquivo(file)
    setProgresso(0)

    // Preview para imagens
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }, [])

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setArrastando(false)
    const file = e.dataTransfer.files[0]
    if (file) selecionarArquivo(file)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setArrastando(true)
  }

  async function handleEnviar() {
    if (!arquivo) return
    setEnviando(true)

    try {
      const { url, tipo } = await uploadArquivo(conversaId, arquivo, setProgresso)
      onEnviado(url, tipo, arquivo.name)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Enviar arquivo</h4>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onFechar}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!arquivo ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setArrastando(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            arrastando ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arraste um arquivo aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Imagem, documento, vídeo ou áudio (máx. 20MB)
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) selecionarArquivo(file)
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          {preview && (
            <div className="flex justify-center">
              <img src={preview} alt="Preview" className="max-h-[200px] rounded-md" />
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            {arquivo.type.startsWith("image/") ? (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Upload className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="truncate flex-1">{arquivo.name}</span>
            <span className="text-muted-foreground text-xs">
              {(arquivo.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>

          {enviando && <Progress value={progresso} className="h-2" />}

          <div className="flex gap-2">
            <Button onClick={handleEnviar} disabled={enviando} size="sm">
              {enviando ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {progresso}%
                </>
              ) : (
                "Enviar"
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setArquivo(null); setPreview(null) }} disabled={enviando}>
              Trocar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
