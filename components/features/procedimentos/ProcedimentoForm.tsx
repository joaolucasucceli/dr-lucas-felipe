"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
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
import { TIPOS_PROCEDIMENTO } from "@/lib/procedimentos/tipos"

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipo: z
    .string()
    .min(1, "Tipo é obrigatório")
    .refine(
      (valor) => TIPOS_PROCEDIMENTO.some((tipo) => tipo === valor),
      "Tipo inválido"
    ),
  descricao: z.string().optional(),
  duracaoMin: z.string().min(1, "Duração é obrigatória"),
  posOperatorio: z.string().optional(),
  // Campos comerciais — todos opcionais. Strings no form, convertidos em number no submit.
  // JLU-167 (25/05/2026): faixa virou fonte primaria; estimado/cheio legados.
  valorBaseMinBrl: z.string().optional(),
  valorBaseMaxBrl: z.string().optional(),
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
  valorBaseMinBrl: number | null
  valorBaseMaxBrl: number | null
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      tipo: "",
      descricao: "",
      duracaoMin: "",
      posOperatorio: "",
      valorBaseMinBrl: "",
      valorBaseMaxBrl: "",
      valorEstimadoBrl: "",
      valorCheioBrl: "",
      parcelamento: "",
      escopoOferta: "",
    },
  })
  const tipoAtual = useWatch({ control, name: "tipo" })

  useEffect(() => {
    if (procedimento) {
      reset({
        nome: procedimento.nome,
        tipo: procedimento.tipo,
        descricao: procedimento.descricao || "",
        duracaoMin: procedimento.duracaoMin.toString(),
        posOperatorio: procedimento.posOperatorio || "",
        valorBaseMinBrl:
          procedimento.valorBaseMinBrl != null
            ? procedimento.valorBaseMinBrl.toString()
            : "",
        valorBaseMaxBrl:
          procedimento.valorBaseMaxBrl != null
            ? procedimento.valorBaseMaxBrl.toString()
            : "",
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
        valorBaseMinBrl: "",
        valorBaseMaxBrl: "",
        valorEstimadoBrl: "",
        valorCheioBrl: "",
        parcelamento: "",
        escopoOferta: "",
      })
    }
  }, [procedimento, reset])

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
    body.valorBaseMinBrl = parseBrl(data.valorBaseMinBrl)
    body.valorBaseMaxBrl = parseBrl(data.valorBaseMaxBrl)
    body.valorEstimadoBrl = parseBrl(data.valorEstimadoBrl)
    body.valorCheioBrl = parseBrl(data.valorCheioBrl)
    body.parcelamento = data.parcelamento?.trim() || null
    body.escopoOferta = data.escopoOferta?.trim() || null

    // Valida coerencia da faixa antes de enviar (CHECK do banco rejeitaria
    // mas mensagem fica feia — pegar aqui pra dar feedback claro).
    const min = body.valorBaseMinBrl as number | null
    const max = body.valorBaseMaxBrl as number | null
    if ((min == null) !== (max == null)) {
      toast.error("Faixa precisa de min E max — ou preencha os dois ou deixe ambos vazios")
      return
    }
    if (min != null && max != null && max < min) {
      toast.error("Valor máximo da faixa precisa ser maior ou igual ao mínimo")
      return
    }

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
          value={tipoAtual || undefined}
          onValueChange={(v) => setValue("tipo", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_PROCEDIMENTO.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.tipo && (
          <p className="text-xs text-destructive">{errors.tipo.message}</p>
        )}
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
        <Label className="text-sm font-semibold">Faixa de orçamento (Ana Júlia cita ao paciente)</Label>
        <p className="text-xs text-muted-foreground">
          Política do Dr. Lucas (25/05/2026): IA cita FAIXA, valor exato sai depois da consulta. Preencha min e max — IA vai falar &quot;R$ X a R$ Y&quot; pro paciente. Se deixar vazio, IA pede foto + região antes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="proc-valor-base-min">Faixa mínima (R$)</Label>
          <Input
            id="proc-valor-base-min"
            type="text"
            inputMode="decimal"
            placeholder="ex: 10000"
            {...register("valorBaseMinBrl")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proc-valor-base-max">Faixa máxima (R$)</Label>
          <Input
            id="proc-valor-base-max"
            type="text"
            inputMode="decimal"
            placeholder="ex: 12000"
            {...register("valorBaseMaxBrl")}
          />
        </div>
      </div>

      <div className="grid gap-2 pt-2 border-t">
        <Label className="text-sm font-semibold text-muted-foreground">Campos legados (descontinuando)</Label>
        <p className="text-xs text-muted-foreground">
          Mantidos por compatibilidade — Ana Júlia usa faixa acima por padrão. Se faixa estiver vazia, IA cai num cálculo automático ±15% sobre o valor estimado.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="proc-valor-estimado" className="text-xs text-muted-foreground">Valor estimado legado (R$)</Label>
          <Input
            id="proc-valor-estimado"
            type="text"
            inputMode="decimal"
            placeholder="ex: 13000"
            {...register("valorEstimadoBrl")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proc-valor-cheio" className="text-xs text-muted-foreground">Valor cheio legado (R$)</Label>
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
