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
      })
    } else {
      reset({
        nome: "",
        tipo: "",
        descricao: "",
        duracaoMin: "",
        posOperatorio: "",
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
    </FormDialog>
  )
}
