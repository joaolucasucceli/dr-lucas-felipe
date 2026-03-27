"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Plus, FileText, Image, Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { UploadDocumento } from "./UploadDocumento"

interface Documento {
  id: string
  tipo: string
  nome: string
  descricao: string | null
  storagePath: string
  tamanhoBytes: number | null
  mimeType: string | null
  criadoEm: string
}

const tipoLabels: Record<string, string> = {
  exame_laboratorial: "Exame",
  laudo: "Laudo",
  termo_consentimento: "Termo",
  receita: "Receita",
  atestado: "Atestado",
  outro: "Outro",
}

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

interface ListaDocumentosProps {
  pacienteId: string
}

export function ListaDocumentos({ pacienteId }: ListaDocumentosProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [uploadAberto, setUploadAberto] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/prontuario/documentos`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setDocumentos(json.dados)
    } catch {
      toast.error("Erro ao carregar documentos")
    } finally {
      setCarregando(false)
    }
  }, [pacienteId])

  useEffect(() => {
    buscar()
  }, [buscar])

  async function handleDownload(docId: string) {
    try {
      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/documentos/${docId}`
      )
      if (!res.ok) throw new Error()
      const json = await res.json()
      window.open(json.url, "_blank")
    } catch {
      toast.error("Erro ao gerar link de download")
    }
  }

  async function handleExcluir(docId: string) {
    try {
      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/documentos/${docId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error()
      toast.success("Documento removido")
      buscar()
    } catch {
      toast.error("Erro ao remover documento")
    } finally {
      setConfirmExcluir(null)
    }
  }

  const isPdf = (mimeType: string | null) => mimeType === "application/pdf"

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Documentos</CardTitle>
          <Button size="sm" onClick={() => setUploadAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Documento
          </Button>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : documentos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum documento anexado.
            </p>
          ) : (
            <div className="space-y-3">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  {isPdf(doc.mimeType) ? (
                    <FileText className="h-8 w-8 text-red-500 shrink-0" />
                  ) : (
                    <Image className="h-8 w-8 text-blue-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">{doc.nome}</p>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {tipoLabels[doc.tipo] || doc.tipo}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(doc.criadoEm), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span>{formatarTamanho(doc.tamanhoBytes)}</span>
                      {doc.descricao && (
                        <span className="truncate">— {doc.descricao}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc.id)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setConfirmExcluir(doc.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadDocumento
        aberto={uploadAberto}
        onFechar={() => setUploadAberto(false)}
        pacienteId={pacienteId}
        onUpload={buscar}
      />

      <ConfirmDialog
        aberto={!!confirmExcluir}
        onFechar={() => setConfirmExcluir(null)}
        onConfirmar={() => confirmExcluir && handleExcluir(confirmExcluir)}
        titulo="Excluir Documento"
        descricao="Tem certeza que deseja excluir este documento? O arquivo será removido permanentemente."
        textoBotao="Excluir"
        variante="destrutivo"
      />
    </>
  )
}
