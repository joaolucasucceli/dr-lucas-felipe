"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useAutosave, IndicadorSalvamento } from "@/hooks/use-autosave"
import type { Anamnese } from "@/hooks/use-prontuario"

interface FormAnamneseProps {
  anamnese: Anamnese
  pacienteId: string
  onAtualizar: () => void
}

export function FormAnamnese({ anamnese, pacienteId, onAtualizar }: FormAnamneseProps) {
  const [queixaPrincipal, setQueixaPrincipal] = useState("")
  const [historicoMedico, setHistoricoMedico] = useState("")
  const [cirurgiasAnteriores, setCirurgiasAnteriores] = useState("")
  const [alergias, setAlergias] = useState("")
  const [medicamentosEmUso, setMedicamentosEmUso] = useState("")
  const [doencasPreExistentes, setDoencasPreExistentes] = useState("")
  const [tabagismo, setTabagismo] = useState<boolean | null>(null)
  const [etilismo, setEtilismo] = useState<boolean | null>(null)
  const [atividadeFisica, setAtividadeFisica] = useState("")
  const [gestacoes, setGestacoes] = useState("")
  const [anticoncepcional, setAnticoncepcional] = useState("")
  const [pesoKg, setPesoKg] = useState("")
  const [alturaCm, setAlturaCm] = useState("")
  const [imc, setImc] = useState("")
  const [pressaoArterial, setPressaoArterial] = useState("")
  const [observacoes, setObservacoes] = useState("")

  const initialized = useRef(false)

  useEffect(() => {
    if (anamnese && !initialized.current) {
      setQueixaPrincipal(anamnese.queixaPrincipal || "")
      setHistoricoMedico(anamnese.historicoMedico || "")
      setCirurgiasAnteriores(anamnese.cirurgiasAnteriores || "")
      setAlergias(anamnese.alergias || "")
      setMedicamentosEmUso(anamnese.medicamentosEmUso || "")
      setDoencasPreExistentes(anamnese.doencasPreExistentes || "")
      setTabagismo(anamnese.tabagismo)
      setEtilismo(anamnese.etilismo)
      setAtividadeFisica(anamnese.atividadeFisica || "")
      setGestacoes(anamnese.gestacoes || "")
      setAnticoncepcional(anamnese.anticoncepcional || "")
      setPesoKg(anamnese.pesoKg?.toString() || "")
      setAlturaCm(anamnese.alturaCm?.toString() || "")
      setImc(anamnese.imc?.toString() || "")
      setPressaoArterial(anamnese.pressaoArterial || "")
      setObservacoes(anamnese.observacoes || "")
      initialized.current = true
    }
  }, [anamnese])

  // Calcular IMC localmente
  useEffect(() => {
    const peso = parseFloat(pesoKg)
    const altura = parseFloat(alturaCm)
    if (peso > 0 && altura > 0) {
      const alturaM = altura / 100
      const imcCalc = peso / (alturaM * alturaM)
      setImc(imcCalc.toFixed(2))
    } else {
      setImc("")
    }
  }, [pesoKg, alturaCm])

  const salvarCampo = useCallback(
    async (dados: Record<string, unknown>) => {
      const res = await fetch(`/api/pacientes/${pacienteId}/prontuario/anamnese`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao salvar")
      }
      onAtualizar()
    },
    [pacienteId, onAtualizar]
  )

  const queixaAutosave = useAutosave({
    valor: queixaPrincipal,
    valorInicial: anamnese?.queixaPrincipal || "",
    onSalvar: async (v) => salvarCampo({ queixaPrincipal: v }),
    delay: 800,
  })

  const historicoAutosave = useAutosave({
    valor: historicoMedico,
    valorInicial: anamnese?.historicoMedico || "",
    onSalvar: async (v) => salvarCampo({ historicoMedico: v }),
    delay: 800,
  })

  const cirurgiasAutosave = useAutosave({
    valor: cirurgiasAnteriores,
    valorInicial: anamnese?.cirurgiasAnteriores || "",
    onSalvar: async (v) => salvarCampo({ cirurgiasAnteriores: v }),
    delay: 800,
  })

  const alergiasAutosave = useAutosave({
    valor: alergias,
    valorInicial: anamnese?.alergias || "",
    onSalvar: async (v) => salvarCampo({ alergias: v }),
    delay: 800,
  })

  const medicamentosAutosave = useAutosave({
    valor: medicamentosEmUso,
    valorInicial: anamnese?.medicamentosEmUso || "",
    onSalvar: async (v) => salvarCampo({ medicamentosEmUso: v }),
    delay: 800,
  })

  const doencasAutosave = useAutosave({
    valor: doencasPreExistentes,
    valorInicial: anamnese?.doencasPreExistentes || "",
    onSalvar: async (v) => salvarCampo({ doencasPreExistentes: v }),
    delay: 800,
  })

  const observacoesAutosave = useAutosave({
    valor: observacoes,
    valorInicial: anamnese?.observacoes || "",
    onSalvar: async (v) => salvarCampo({ observacoes: v }),
    delay: 800,
  })

  async function salvarCampoManual(campo: string, valor: unknown) {
    try {
      await salvarCampo({ [campo]: valor })
      toast.success("Salvo")
    } catch {
      toast.error("Erro ao salvar")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anamnese</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["queixa", "historico"]} className="space-y-2">
          {/* Seção 1: Queixa Principal */}
          <AccordionItem value="queixa">
            <AccordionTrigger>Queixa Principal</AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ana-queixa">Queixa principal do paciente</Label>
                  <IndicadorSalvamento status={queixaAutosave.status} />
                </div>
                <Textarea
                  id="ana-queixa"
                  value={queixaPrincipal}
                  onChange={(e) => setQueixaPrincipal(e.target.value)}
                  rows={3}
                  placeholder="Descreva a queixa principal..."
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Seção 2: Histórico Médico */}
          <AccordionItem value="historico">
            <AccordionTrigger>Histórico Médico</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ana-historico">Histórico médico</Label>
                  <IndicadorSalvamento status={historicoAutosave.status} />
                </div>
                <Textarea
                  id="ana-historico"
                  value={historicoMedico}
                  onChange={(e) => setHistoricoMedico(e.target.value)}
                  rows={3}
                  placeholder="Histórico de doenças, internações..."
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ana-doencas">Doenças pré-existentes</Label>
                  <IndicadorSalvamento status={doencasAutosave.status} />
                </div>
                <Textarea
                  id="ana-doencas"
                  value={doencasPreExistentes}
                  onChange={(e) => setDoencasPreExistentes(e.target.value)}
                  rows={2}
                  placeholder="Diabetes, hipertensão, cardiopatia..."
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ana-cirurgias">Cirurgias anteriores</Label>
                  <IndicadorSalvamento status={cirurgiasAutosave.status} />
                </div>
                <Textarea
                  id="ana-cirurgias"
                  value={cirurgiasAnteriores}
                  onChange={(e) => setCirurgiasAnteriores(e.target.value)}
                  rows={2}
                  placeholder="Cirurgias já realizadas..."
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Seção 3: Alergias e Medicamentos */}
          <AccordionItem value="alergias">
            <AccordionTrigger>Alergias e Medicamentos</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ana-alergias">Alergias</Label>
                  <IndicadorSalvamento status={alergiasAutosave.status} />
                </div>
                <Textarea
                  id="ana-alergias"
                  value={alergias}
                  onChange={(e) => setAlergias(e.target.value)}
                  rows={2}
                  placeholder="Alergias a medicamentos, alimentos, materiais..."
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ana-medicamentos">Medicamentos em uso</Label>
                  <IndicadorSalvamento status={medicamentosAutosave.status} />
                </div>
                <Textarea
                  id="ana-medicamentos"
                  value={medicamentosEmUso}
                  onChange={(e) => setMedicamentosEmUso(e.target.value)}
                  rows={2}
                  placeholder="Medicamentos que o paciente utiliza atualmente..."
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Seção 4: Hábitos */}
          <AccordionItem value="habitos">
            <AccordionTrigger>Hábitos de Vida</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ana-tabagismo"
                    checked={tabagismo ?? false}
                    onCheckedChange={(v) => {
                      const valor = !!v
                      setTabagismo(valor)
                      salvarCampoManual("tabagismo", valor)
                    }}
                  />
                  <Label htmlFor="ana-tabagismo" className="text-sm font-normal">
                    Tabagismo
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ana-etilismo"
                    checked={etilismo ?? false}
                    onCheckedChange={(v) => {
                      const valor = !!v
                      setEtilismo(valor)
                      salvarCampoManual("etilismo", valor)
                    }}
                  />
                  <Label htmlFor="ana-etilismo" className="text-sm font-normal">
                    Etilismo
                  </Label>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ana-atividade">Atividade Física</Label>
                <Input
                  id="ana-atividade"
                  value={atividadeFisica}
                  onChange={(e) => setAtividadeFisica(e.target.value)}
                  onBlur={() => salvarCampoManual("atividadeFisica", atividadeFisica)}
                  placeholder="Tipo e frequência..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ana-gestacoes">Gestações</Label>
                  <Input
                    id="ana-gestacoes"
                    value={gestacoes}
                    onChange={(e) => setGestacoes(e.target.value)}
                    onBlur={() => salvarCampoManual("gestacoes", gestacoes)}
                    placeholder="G0P0A0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ana-anticoncepcional">Anticoncepcional</Label>
                  <Input
                    id="ana-anticoncepcional"
                    value={anticoncepcional}
                    onChange={(e) => setAnticoncepcional(e.target.value)}
                    onBlur={() => salvarCampoManual("anticoncepcional", anticoncepcional)}
                    placeholder="Tipo em uso..."
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Seção 5: Medidas */}
          <AccordionItem value="medidas">
            <AccordionTrigger>Medidas e Sinais Vitais</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ana-peso">Peso (kg)</Label>
                  <Input
                    id="ana-peso"
                    type="number"
                    step="0.1"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    onBlur={() => {
                      const v = pesoKg ? parseFloat(pesoKg) : null
                      salvarCampoManual("pesoKg", v)
                    }}
                    placeholder="70.0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ana-altura">Altura (cm)</Label>
                  <Input
                    id="ana-altura"
                    type="number"
                    step="0.1"
                    value={alturaCm}
                    onChange={(e) => setAlturaCm(e.target.value)}
                    onBlur={() => {
                      const v = alturaCm ? parseFloat(alturaCm) : null
                      salvarCampoManual("alturaCm", v)
                    }}
                    placeholder="170.0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ana-imc">IMC</Label>
                  <Input
                    id="ana-imc"
                    value={imc}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ana-pa">Pressão Arterial</Label>
                <Input
                  id="ana-pa"
                  value={pressaoArterial}
                  onChange={(e) => setPressaoArterial(e.target.value)}
                  onBlur={() => salvarCampoManual("pressaoArterial", pressaoArterial)}
                  placeholder="120/80 mmHg"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ana-obs">Observações</Label>
                  <IndicadorSalvamento status={observacoesAutosave.status} />
                </div>
                <Textarea
                  id="ana-obs"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Observações adicionais da anamnese..."
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
