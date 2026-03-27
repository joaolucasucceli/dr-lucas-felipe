"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RegistroCirurgico } from "@/hooks/use-prontuario"

const tiposAnestesia = [
  { value: "local", label: "Local" },
  { value: "sedacao", label: "Sedação" },
  { value: "geral", label: "Geral" },
  { value: "raquidiana", label: "Raquidiana" },
  { value: "peridural", label: "Peridural" },
  { value: "bloqueio_regional", label: "Bloqueio Regional" },
]

interface Marco {
  descricao: string
  dataPrevista: string
  dataConcluida?: string | null
  concluido: boolean
}

interface FormRegistroCirurgicoProps {
  aberto: boolean
  onFechar: () => void
  pacienteId: string
  evolucaoId: string
  registro?: RegistroCirurgico | null
  onSalvar: () => void
}

export function FormRegistroCirurgico({
  aberto,
  onFechar,
  pacienteId,
  evolucaoId,
  registro,
  onSalvar,
}: FormRegistroCirurgicoProps) {
  const isEdit = !!registro

  const [tipoAnestesia, setTipoAnestesia] = useState("local")
  const [anestesista, setAnestesista] = useState("")
  const [tempoMinutos, setTempoMinutos] = useState("")
  const [sangramento, setSangramento] = useState("")
  const [complicacoes, setComplicacoes] = useState("")
  const [tecnica, setTecnica] = useState("")
  const [materiais, setMateriais] = useState("")
  const [orientacoesPosOp, setOrientacoesPosOp] = useState("")
  const [marcos, setMarcos] = useState<Marco[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto && registro) {
      setTipoAnestesia(registro.tipoAnestesia)
      setAnestesista(registro.anestesista || "")
      setTempoMinutos(String(registro.tempoCircurgicoMinutos))
      setSangramento(registro.sangramento || "")
      setComplicacoes(registro.complicacoes || "")
      setTecnica(registro.tecnicaUtilizada)
      setMateriais(registro.materiaisUtilizados || "")
      setOrientacoesPosOp(registro.orientacoesPosOp || "")
      setMarcos(registro.marcosRecuperacao || [])
    } else if (aberto && !registro) {
      setTipoAnestesia("local")
      setAnestesista("")
      setTempoMinutos("")
      setSangramento("")
      setComplicacoes("")
      setTecnica("")
      setMateriais("")
      setOrientacoesPosOp("")
      setMarcos([])
    }
  }, [aberto, registro])

  function adicionarMarco() {
    setMarcos([...marcos, { descricao: "", dataPrevista: "", concluido: false }])
  }

  function removerMarco(i: number) {
    setMarcos(marcos.filter((_, idx) => idx !== i))
  }

  function atualizarMarco(i: number, campo: keyof Marco, valor: string | boolean) {
    const novos = [...marcos]
    novos[i] = { ...novos[i], [campo]: valor }
    setMarcos(novos)
  }

  async function handleSubmit() {
    if (!tecnica.trim()) {
      toast.error("Técnica utilizada é obrigatória")
      return
    }
    if (!tempoMinutos || parseInt(tempoMinutos) <= 0) {
      toast.error("Tempo cirúrgico deve ser positivo")
      return
    }

    setSalvando(true)
    try {
      const dados: Record<string, unknown> = {
        tipoAnestesia,
        tempoCircurgicoMinutos: parseInt(tempoMinutos),
        tecnicaUtilizada: tecnica.trim(),
      }
      if (anestesista.trim()) dados.anestesista = anestesista.trim()
      if (sangramento.trim()) dados.sangramento = sangramento.trim()
      if (complicacoes.trim()) dados.complicacoes = complicacoes.trim()
      if (materiais.trim()) dados.materiaisUtilizados = materiais.trim()
      if (orientacoesPosOp.trim()) dados.orientacoesPosOp = orientacoesPosOp.trim()
      if (marcos.length > 0) {
        dados.marcosRecuperacao = marcos.filter((m) => m.descricao.trim())
      }

      const url = `/api/pacientes/${pacienteId}/prontuario/evolucoes/${evolucaoId}/registro-cirurgico`
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao salvar")
      }

      toast.success(isEdit ? "Registro atualizado" : "Registro cirúrgico criado")
      onSalvar()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar registro cirúrgico")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar Registro Cirúrgico" : "Registro Cirúrgico"}</SheetTitle>
          <SheetDescription>
            Detalhes do procedimento cirúrgico realizado.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo de Anestesia *</Label>
              <Select value={tipoAnestesia} onValueChange={setTipoAnestesia}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposAnestesia.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-anestesista">Anestesista</Label>
              <Input
                id="rc-anestesista"
                value={anestesista}
                onChange={(e) => setAnestesista(e.target.value)}
                placeholder="Nome do anestesista"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rc-tempo">Duração (min) *</Label>
              <Input
                id="rc-tempo"
                type="number"
                value={tempoMinutos}
                onChange={(e) => setTempoMinutos(e.target.value)}
                placeholder="120"
                min={1}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-sangramento">Sangramento</Label>
              <Input
                id="rc-sangramento"
                value={sangramento}
                onChange={(e) => setSangramento(e.target.value)}
                placeholder="Mínimo, moderado..."
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rc-tecnica">Técnica Utilizada *</Label>
            <Textarea
              id="rc-tecnica"
              value={tecnica}
              onChange={(e) => setTecnica(e.target.value)}
              rows={3}
              placeholder="Descreva a técnica cirúrgica..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rc-materiais">Materiais Utilizados</Label>
            <Textarea
              id="rc-materiais"
              value={materiais}
              onChange={(e) => setMateriais(e.target.value)}
              rows={2}
              placeholder="Lista de materiais (opcional)..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rc-complicacoes">Complicações</Label>
            <Textarea
              id="rc-complicacoes"
              value={complicacoes}
              onChange={(e) => setComplicacoes(e.target.value)}
              rows={2}
              placeholder="Registrar complicações se houver..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rc-orientacoes">Orientações Pós-operatórias</Label>
            <Textarea
              id="rc-orientacoes"
              value={orientacoesPosOp}
              onChange={(e) => setOrientacoesPosOp(e.target.value)}
              rows={3}
              placeholder="Cuidados e orientações pós-op..."
            />
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Marcos de Recuperação</Label>
              <Button type="button" variant="outline" size="sm" onClick={adicionarMarco}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {marcos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum marco adicionado. Clique em &quot;Adicionar&quot; para definir marcos de recuperação.
              </p>
            ) : (
              <div className="space-y-3">
                {marcos.map((marco, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid gap-1.5">
                      <Input
                        value={marco.descricao}
                        onChange={(e) => atualizarMarco(i, "descricao", e.target.value)}
                        placeholder="Ex: Retirada de pontos"
                        className="h-8 text-xs"
                      />
                      <Input
                        type="date"
                        value={marco.dataPrevista}
                        onChange={(e) => atualizarMarco(i, "dataPrevista", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removerMarco(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={salvando}>
            {salvando ? "Salvando..." : isEdit ? "Salvar Alterações" : "Registrar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
