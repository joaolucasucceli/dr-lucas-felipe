"use client"

import { useState } from "react"
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
import { obterUnidade, labelsTipo, placeholderTipo } from "@/lib/sinais-vitais/limiares"

const tiposSinal = [
  { value: "pressao_arterial", label: "Pressão Arterial" },
  { value: "frequencia_cardiaca", label: "Frequência Cardíaca" },
  { value: "temperatura", label: "Temperatura" },
  { value: "saturacao_o2", label: "Saturação O₂" },
  { value: "glicemia", label: "Glicemia" },
]

interface FormSinalVitalProps {
  aberto: boolean
  onFechar: () => void
  pacienteId: string
  onSalvar: () => void
}

export function FormSinalVital({
  aberto,
  onFechar,
  pacienteId,
  onSalvar,
}: FormSinalVitalProps) {
  const [tipo, setTipo] = useState("pressao_arterial")
  const [valor, setValor] = useState("")
  const [dataRegistro, setDataRegistro] = useState("")
  const [observacao, setObservacao] = useState("")
  const [salvando, setSalvando] = useState(false)

  function resetar() {
    setTipo("pressao_arterial")
    setValor("")
    setDataRegistro("")
    setObservacao("")
  }

  async function handleSubmit() {
    if (!valor.trim()) {
      toast.error("Informe o valor do sinal vital")
      return
    }

    setSalvando(true)
    try {
      const dados: Record<string, unknown> = {
        tipo,
        valor: valor.trim(),
        unidade: obterUnidade(tipo),
      }
      if (observacao.trim()) dados.observacao = observacao.trim()
      if (dataRegistro) dados.dataRegistro = new Date(dataRegistro).toISOString()

      const res = await fetch(
        `/api/pacientes/${pacienteId}/prontuario/sinais-vitais`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao registrar")
      }

      toast.success("Sinal vital registrado")
      onSalvar()
      onFechar()
      resetar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar sinal vital")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={(open) => { if (!open) { onFechar(); resetar() } }}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Registrar Sinal Vital</SheetTitle>
          <SheetDescription>
            Adicione uma nova aferição ao prontuário do paciente.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v); setValor("") }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposSinal.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sv-valor">
              Valor ({obterUnidade(tipo)}) *
            </Label>
            <Input
              id="sv-valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={placeholderTipo[tipo] || ""}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sv-data">Data/Hora</Label>
            <Input
              id="sv-data"
              type="datetime-local"
              value={dataRegistro}
              onChange={(e) => setDataRegistro(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se não informada, será usada a data/hora atual.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sv-obs">Observação</Label>
            <Textarea
              id="sv-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Observação (opcional)..."
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => { onFechar(); resetar() }} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={salvando}>
            {salvando ? "Salvando..." : "Registrar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
