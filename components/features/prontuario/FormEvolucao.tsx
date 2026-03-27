"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import type { Evolucao } from "@/hooks/use-prontuario"

const tiposEvolucao = [
  { value: "consulta", label: "Consulta" },
  { value: "procedimento", label: "Procedimento" },
  { value: "retorno", label: "Retorno" },
  { value: "prescricao", label: "Prescrição" },
  { value: "intercorrencia", label: "Intercorrência" },
  { value: "observacao", label: "Observação" },
]

interface FormEvolucaoProps {
  aberto: boolean
  onFechar: () => void
  pacienteId: string
  evolucao?: Evolucao | null
  onSalvar: () => void
}

export function FormEvolucao({
  aberto,
  onFechar,
  pacienteId,
  evolucao,
  onSalvar,
}: FormEvolucaoProps) {
  const isEdit = !!evolucao

  const [tipo, setTipo] = useState("consulta")
  const [titulo, setTitulo] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [prescricao, setPrescricao] = useState("")
  const [orientacoes, setOrientacoes] = useState("")
  const [dataRegistro, setDataRegistro] = useState("")
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto && evolucao) {
      setTipo(evolucao.tipo)
      setTitulo(evolucao.titulo)
      setConteudo(evolucao.conteudo)
      setPrescricao(evolucao.prescricao || "")
      setOrientacoes(evolucao.orientacoes || "")
      setDataRegistro(evolucao.dataRegistro ? evolucao.dataRegistro.slice(0, 16) : "")
    } else if (aberto && !evolucao) {
      setTipo("consulta")
      setTitulo("")
      setConteudo("")
      setPrescricao("")
      setOrientacoes("")
      setDataRegistro("")
    }
  }, [aberto, evolucao])

  async function handleSubmit() {
    if (!titulo.trim() || !conteudo.trim()) {
      toast.error("Título e conteúdo são obrigatórios")
      return
    }

    setSalvando(true)
    try {
      const dados: Record<string, unknown> = {
        tipo,
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
      }
      if (prescricao.trim()) dados.prescricao = prescricao.trim()
      if (orientacoes.trim()) dados.orientacoes = orientacoes.trim()
      if (dataRegistro) dados.dataRegistro = new Date(dataRegistro).toISOString()

      const url = isEdit
        ? `/api/pacientes/${pacienteId}/prontuario/evolucoes/${evolucao!.id}`
        : `/api/pacientes/${pacienteId}/prontuario/evolucoes`

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao salvar")
      }

      toast.success(isEdit ? "Evolução atualizada" : "Evolução registrada")
      onSalvar()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar evolução")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar Evolução" : "Nova Evolução"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Altere os dados da evolução clínica."
              : "Registre uma nova entrada na evolução clínica do paciente."}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposEvolucao.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-titulo">Título *</Label>
            <Input
              id="ev-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Consulta pré-operatória"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-conteudo">Conteúdo *</Label>
            <Textarea
              id="ev-conteudo"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={5}
              placeholder="Descreva a evolução clínica..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-prescricao">Prescrição</Label>
            <Textarea
              id="ev-prescricao"
              value={prescricao}
              onChange={(e) => setPrescricao(e.target.value)}
              rows={3}
              placeholder="Prescrição médica (opcional)..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-orientacoes">Orientações</Label>
            <Textarea
              id="ev-orientacoes"
              value={orientacoes}
              onChange={(e) => setOrientacoes(e.target.value)}
              rows={3}
              placeholder="Orientações ao paciente (opcional)..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-data">Data do Registro</Label>
            <Input
              id="ev-data"
              type="datetime-local"
              value={dataRegistro}
              onChange={(e) => setDataRegistro(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se não informada, será usada a data/hora atual.
            </p>
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
