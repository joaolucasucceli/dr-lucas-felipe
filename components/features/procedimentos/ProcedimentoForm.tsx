"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDialog } from "@/components/features/shared/FormDialog"

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipo: z.string().min(2, "Tipo é obrigatório"),
  descricao: z.string().optional(),
  duracaoMin: z.string().min(1, "Duração é obrigatória"),
  posOperatorio: z.string().optional(),
  // Campos comerciais — todos opcionais. Strings no form, convertidos em number no submit.
  valorEstimadoBrl: z.string().optional(),
  valorCheioBrl: z.string().optional(),
  parcelamento: z.string().optional(),
  escopoOferta: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Procedimento {
  id: string
  nome: string
  tipo: string
  descricao: string | null
  duracaoMin: number
  posOperatorio: string | null
  ativo: boolean
  valorEstimadoBrl: number | null
  valorCheioBrl: number | null
  parcelamento: string | null
  escopoOferta: string | null
}

interface ProcedimentoFormProps {
  procedimento?: Procedimento | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function ProcedimentoForm({
  procedimento,
  aberto,
  onFechar,
  onSucesso,
}: ProcedimentoFormProps) {
  const editando = !!procedimento
  const [tipos, setTipos] = useState<{ id: string; nome: string }[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      tipo: "cirurgico",
      descricao: "",
      duracaoMin: "",
      posOperatorio: "",
      valorEstimadoBrl: "",
      valorCheioBrl: "",
      parcelamento: "",
      escopoOferta: "",
    },
  })

  useEffect(() => {
    if (procedimento) {
      reset({
        nome: procedimento.nome,
        tipo: procedimento.tipo,
        descricao: procedimento.descricao || "",
        duracaoMin: procedimento.duracaoMin.toString(),
        posOperatorio: procedimento.posOperatorio || "",
        valorEstimadoBrl:
          procedimento.valorEstimadoBrl != null
            ? procedimento.valorEstimadoBrl.toString()
            : "",
        valorCheioBrl:
          procedimento.valorCheioBrl != null
            ? procedimento.valorCheioBrl.toString()
            : "",
        parcelamento: procedimento.parcelamento || "",
        escopoOferta: procedimento.escopoOferta || "",
      })
    } else {
      reset({
        nome: "",
        tipo: "",
        descricao: "",
        duracaoMin: "",
        posOperatorio: "",
        valorEstimadoBrl: "",
        valorCheioBrl: "",
        parcelamento: "",
        escopoOferta: "",
      })
    }
  }, [procedimento, reset])

  useEffect(() => {
    if (!aberto) return
    fetch("/api/tipos-procedimento")
      .then((r) => r.json())
      .then((j) => setTipos((j.dados || []).filter((t: { ativo: boolean }) => t.ativo)))
      .catch(() => {})
  }, [aberto])

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset()
      onFechar()
    }
  }

  async function onSubmit(data: FormData) {
    const body: Record<string, unknown> = {
      nome: data.nome,
      tipo: data.tipo,
      duracaoMin: parseInt(data.duracaoMin, 10),
    }

    if (data.descricao) body.descricao = data.descricao
    if (data.posOperatorio) body.posOperatorio = data.posOperatorio

    // Campos comerciais — converte string vazia em null (pra IA detectar "sem valor fixo").
    // Numero: aceita "13000", "13.000", "13000,00" — strip nao-digito (excepto virgula/ponto).
    const parseBrl = (s: string | undefined): number | null => {
      if (!s || !s.trim()) return null
      const limpo = s.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".")
      const n = Number(limpo)
      return Number.isFinite(n) ? n : null
    }
    body.valorEstimadoBrl = parseBrl(data.valorEstimadoBrl)
    body.valorCheioBrl = parseBrl(data.valorCheioBrl)
    body.parcelamento = data.parcelamento?.trim() || null
    body.escopoOferta = data.escopoOferta?.trim() || null

    try {
      const url = editando
        ? `/api/procedimentos/${procedimento.id}`
        : "/api/procedimentos"
      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao salvar procedimento")
        return
      }

      toast.success(editando ? "Procedimento atualizado" : "Procedimento criado")
      reset()
      onSucesso()
    } catch {
      toast.error("Erro ao salvar procedimento")
    }
  }

  return (
    <FormDialog
      aberto={aberto}
      onFechar={() => handleOpenChange(false)}
      titulo="Procedimento"
      editando={editando}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      largura="lg"
    >
      <div className="grid gap-2">
        <Label htmlFor="proc-nome">Nome</Label>
        <Input id="proc-nome" {...register("nome")} />
        {errors.nome && (
          <p className="text-xs text-destructive">{errors.nome.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Tipo</Label>
        <Select
          defaultValue={procedimento?.tipo || ""}
          onValueChange={(v) => setValue("tipo", v)}
          disabled={tipos.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={tipos.length === 0 ? "Carregando..." : "Selecione..."} />
          </SelectTrigger>
          <SelectContent>
            {tipos.map((t) => (
              <SelectItem key={t.id} value={t.nome}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="proc-descricao">Descrição</Label>
        <Textarea id="proc-descricao" {...register("descricao")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="proc-duracao">Duração estimada da cirurgia (min)</Label>
        <Input
          id="proc-duracao"
          type="number"
          min="1"
          {...register("duracaoMin")}
        />
        <p className="text-xs text-muted-foreground">
          Tempo médio do procedimento em si — informação clínica que a Ana Júlia pode citar se a paciente perguntar. NÃO afeta o slot da avaliação online (sempre 1h).
        </p>
        {errors.duracaoMin && (
          <p className="text-xs text-destructive">{errors.duracaoMin.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="proc-pos">Pós-operatório</Label>
        <Textarea id="proc-pos" {...register("posOperatorio")} />
      </div>

      <div className="grid gap-2 pt-2 border-t">
        <Label className="text-sm font-semibold">Informações comerciais</Label>
        <p className="text-xs text-muted-foreground">
          A Ana Júlia usa esses dados pra falar o valor quando o paciente perguntar. Deixe o valor estimado em branco se quiser que a IA peça mais info ao paciente (foto + região) antes de citar valor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="proc-valor-estimado">Valor estimado (R$)</Label>
          <Input
            id="proc-valor-estimado"
            type="text"
            inputMode="decimal"
            placeholder="ex: 13000"
            {...register("valorEstimadoBrl")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proc-valor-cheio">Valor cheio (R$, opcional)</Label>
          <Input
            id="proc-valor-cheio"
            type="text"
            inputMode="decimal"
            placeholder="ex: 20000 (sem desconto)"
            {...register("valorCheioBrl")}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="proc-parcelamento">Parcelamento (opcional)</Label>
        <Input
          id="proc-parcelamento"
          type="text"
          placeholder="ex: até 12× no cartão"
          {...register("parcelamento")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="proc-escopo">Escopo da oferta (opcional)</Label>
        <Input
          id="proc-escopo"
          type="text"
          placeholder="ex: Abdome + Flancos + Enxerto Glúteo"
          {...register("escopoOferta")}
        />
        <p className="text-xs text-muted-foreground">
          Útil pra combos do Programa Paciente Modelo — deixa a IA descrever qual região está incluída na oferta.
        </p>
      </div>
    </FormDialog>
  )
}
