"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Upload, FileText, Image, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const tiposDocumento = [
  { value: "exame_laboratorial", label: "Exame Laboratorial" },
  { value: "laudo", label: "Laudo" },
  { value: "termo_consentimento", label: "Termo de Consentimento" },
  { value: "receita", label: "Receita" },
  { value: "atestado", label: "Atestado" },
  { value: "outro", label: "Outro" },
]

interface UploadDocumentoProps {
  aberto: boolean
  onFechar: () => void
  pacienteId: string
  onUpload: () => void
}

export function UploadDocumento({
  aberto,
  onFechar,
  pacienteId,
  onUpload,
}: UploadDocumentoProps) {
  const [tipo, setTipo] = useState("exame_laboratorial")
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function limpar() {
    setTipo("exame_laboratorial")
    setNome("")
    setDescricao("")
    setArquivo(null)
  }

  function handleFechar() {
    limpar()
    onFechar()
  }

  function handleArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)
    if (!nome.trim()) {
      setNome(file.name.replace(/\.[^.]+$/, ""))
    }
  }

  async function handleSubmit() {
    if (!arquivo) {
      toast.error("Selecione um arquivo")
      return
    }
    if (!nome.trim()) {
      toast.error("Nome é obrigatório")
      return
    }

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append("arquivo", arquivo)
      formData.append("tipo", tipo)
      formData.append("nome", nome.trim())
      if (descricao.trim()) formData.append("descricao", descricao.trim())

      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/documentos`,
        { method: "POST", body: formData }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao enviar documento")
      }

      toast.success("Documento enviado")
      onUpload()
      handleFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar documento")
    } finally {
      setEnviando(false)
    }
  }

  const isImagem = arquivo?.type.startsWith("image/")

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && handleFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
          <DialogDescription>
            Envie exames, laudos, termos ou receitas para o prontuário.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipo de Documento *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposDocumento.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="doc-nome">Nome *</Label>
            <Input
              id="doc-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Hemograma completo"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="doc-descricao">Descrição</Label>
            <Textarea
              id="doc-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              placeholder="Detalhes sobre o documento (opcional)..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Arquivo *</Label>
            {arquivo ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {isImagem ? (
                  <Image className="h-5 w-5 text-blue-500 shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{arquivo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    setArquivo(null)
                    if (inputRef.current) inputRef.current.value = ""
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar (PDF, JPEG, PNG, WebP — máx. 15MB)
                </p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleArquivoChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
