"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Plus, Trash2, Upload, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { ComparacaoFotos } from "./ComparacaoFotos"

interface FotoProntuario {
  id: string
  url: string
  descricao: string | null
  tipoFoto: string | null
  dataRegistro: string
  criadoEm: string
}

const tiposFoto = [
  { value: "pre_operatorio", label: "Pré-operatório" },
  { value: "pos_operatorio", label: "Pós-operatório" },
  { value: "acompanhamento", label: "Acompanhamento" },
]

const tipoLabels: Record<string, string> = {
  pre_operatorio: "Pré-op",
  pos_operatorio: "Pós-op",
  acompanhamento: "Acompanhamento",
}

const tipoCores: Record<string, string> = {
  pre_operatorio: "bg-blue-100 text-blue-700",
  pos_operatorio: "bg-green-100 text-green-700",
  acompanhamento: "bg-amber-100 text-amber-700",
}

interface GaleriaFotosProntuarioProps {
  pacienteId: string
}

export function GaleriaFotosProntuario({ pacienteId }: GaleriaFotosProntuarioProps) {
  const [fotos, setFotos] = useState<FotoProntuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [uploadAberto, setUploadAberto] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null)
  const [comparacaoAberta, setComparacaoAberta] = useState(false)

  // Upload state
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [tipoFoto, setTipoFoto] = useState("pre_operatorio")
  const [descricao, setDescricao] = useState("")
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/prontuario/fotos`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setFotos(json.dados)
    } catch {
      toast.error("Erro ao carregar fotos")
    } finally {
      setCarregando(false)
    }
  }, [pacienteId])

  useEffect(() => {
    buscar()
  }, [buscar])

  function fecharUpload() {
    setUploadAberto(false)
    setArquivo(null)
    setTipoFoto("pre_operatorio")
    setDescricao("")
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleUpload() {
    if (!arquivo) {
      toast.error("Selecione uma foto")
      return
    }

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append("arquivo", arquivo)
      formData.append("tipoFoto", tipoFoto)
      if (descricao.trim()) formData.append("descricao", descricao.trim())

      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/fotos`,
        { method: "POST", body: formData }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao enviar foto")
      }

      toast.success("Foto enviada")
      buscar()
      fecharUpload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar foto")
    } finally {
      setEnviando(false)
    }
  }

  async function handleExcluir(fotoId: string) {
    try {
      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/fotos/${fotoId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error()
      toast.success("Foto removida")
      buscar()
    } catch {
      toast.error("Erro ao remover foto")
    } finally {
      setConfirmExcluir(null)
    }
  }

  const fotosFiltradas =
    filtroTipo === "todos"
      ? fotos
      : fotos.filter((f) => f.tipoFoto === filtroTipo)

  // Agrupar por data
  const grupos = fotosFiltradas.reduce<Record<string, FotoProntuario[]>>(
    (acc, foto) => {
      const data = format(new Date(foto.dataRegistro), "yyyy-MM-dd")
      if (!acc[data]) acc[data] = []
      acc[data].push(foto)
      return acc
    },
    {}
  )

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Fotos Clínicas</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposFoto.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setComparacaoAberta(true)}
              disabled={
                !fotos.some((f) => f.tipoFoto === "pre_operatorio") ||
                !fotos.some((f) => f.tipoFoto === "pos_operatorio")
              }
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Comparar
            </Button>
            <Button size="sm" onClick={() => setUploadAberto(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Foto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : fotosFiltradas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma foto clínica registrada.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grupos)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([data, fotosGrupo]) => (
                  <div key={data}>
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                      {format(new Date(data), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {fotosGrupo.map((foto) => (
                        <div
                          key={foto.id}
                          className="group relative rounded-lg overflow-hidden border"
                        >
                          <img
                            src={foto.url}
                            alt={foto.descricao || "Foto clínica"}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white hover:text-red-300 hover:bg-transparent"
                              onClick={() => setConfirmExcluir(foto.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="p-2">
                            {foto.tipoFoto && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${tipoCores[foto.tipoFoto] || ""}`}
                              >
                                {tipoLabels[foto.tipoFoto] || foto.tipoFoto}
                              </Badge>
                            )}
                            {foto.descricao && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {foto.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Upload */}
      <Dialog open={uploadAberto} onOpenChange={(open) => !open && fecharUpload()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Foto Clínica</DialogTitle>
            <DialogDescription>
              Envie uma foto para o prontuário do paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={tipoFoto} onValueChange={setTipoFoto}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposFoto.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="foto-descricao">Descrição</Label>
              <Input
                id="foto-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição da foto (opcional)"
              />
            </div>

            <div className="grid gap-2">
              <Label>Foto *</Label>
              {arquivo ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={URL.createObjectURL(arquivo)}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 bg-black/50 text-white hover:bg-black/70"
                    onClick={() => {
                      setArquivo(null)
                      if (inputRef.current) inputRef.current.value = ""
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar (JPEG, PNG, WebP — máx. 10MB)
                  </p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fecharUpload} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ComparacaoFotos
        fotos={fotos}
        aberto={comparacaoAberta}
        onFechar={() => setComparacaoAberta(false)}
      />

      <ConfirmDialog
        aberto={!!confirmExcluir}
        onFechar={() => setConfirmExcluir(null)}
        onConfirmar={() => confirmExcluir && handleExcluir(confirmExcluir)}
        titulo="Excluir Foto"
        descricao="Tem certeza que deseja excluir esta foto? A imagem será removida permanentemente."
        textoBotao="Excluir"
        variante="destrutivo"
      />
    </>
  )
}
