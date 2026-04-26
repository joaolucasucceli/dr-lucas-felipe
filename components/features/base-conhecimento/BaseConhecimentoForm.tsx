"use client"

import { useEffect } from "react"
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
import { SECOES_BASE_CONHECIMENTO } from "@/lib/validations/base-conhecimento"

const formSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  conteudo: z.string().min(5, "Conteúdo deve ter pelo menos 5 caracteres"),
  secao: z.enum(SECOES_BASE_CONHECIMENTO, { message: "Seção é obrigatória" }),
  ordem: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface BaseConhecimento {
  id: string
  titulo: string
  conteudo: string
  secao: string
  ordem: number
  ativo: boolean
}

interface BaseConhecimentoFormProps {
  registro?: BaseConhecimento | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

const SECAO_LABELS: Record<string, string> = {
  clinica: "Clínica",
  procedimentos: "Procedimentos",
  "pos-operatorio": "Pós-operatório",
  pagamento: "Pagamento",
  geral: "Geral",
}

export function BaseConhecimentoForm({
  registro,
  aberto,
  onFechar,
  onSucesso,
}: BaseConhecimentoFormProps) {
  const editando = !!registro

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      conteudo: "",
      secao: "geral",
      ordem: "0",
    },
  })

  const secaoSelecionada = watch("secao")

  useEffect(() => {
    if (registro) {
      reset({
        titulo: registro.titulo,
        conteudo: registro.conteudo,
        secao: registro.secao as (typeof SECOES_BASE_CONHECIMENTO)[number],
        ordem: registro.ordem.toString(),
      })
    } else {
      reset({
        titulo: "",
        conteudo: "",
        secao: "geral",
        ordem: "0",
      })
    }
  }, [registro, reset])

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset()
      onFechar()
    }
  }

  async function onSubmit(data: FormData) {
    const body: Record<string, unknown> = {
      titulo: data.titulo,
      conteudo: data.conteudo,
      secao: data.secao,
      ordem: data.ordem ? parseInt(data.ordem, 10) : 0,
    }

    try {
      const url = editando
        ? `/api/base-conhecimento/${registro.id}`
        : "/api/base-conhecimento"
      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao salvar registro")
        return
      }

      toast.success(editando ? "Registro atualizado" : "Registro criado")
      reset()
      onSucesso()
    } catch {
      toast.error("Erro ao salvar registro")
    }
  }

  return (
    <FormDialog
      aberto={aberto}
      onFechar={() => handleOpenChange(false)}
      titulo="Conhecimento"
      editando={editando}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      largura="lg"
    >
      <div className="grid gap-2">
        <Label htmlFor="bc-titulo">Título</Label>
        <Input id="bc-titulo" {...register("titulo")} />
        {errors.titulo && (
          <p className="text-xs text-destructive">{errors.titulo.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Seção</Label>
          <Select
            value={secaoSelecionada}
            onValueChange={(v) =>
              setValue("secao", v as (typeof SECOES_BASE_CONHECIMENTO)[number])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {SECOES_BASE_CONHECIMENTO.map((s) => (
                <SelectItem key={s} value={s}>
                  {SECAO_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.secao && (
            <p className="text-xs text-destructive">{errors.secao.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bc-ordem">Ordem</Label>
          <Input id="bc-ordem" type="number" min="0" {...register("ordem")} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bc-conteudo">Conteúdo</Label>
        <Textarea
          id="bc-conteudo"
          rows={6}
          {...register("conteudo")}
          placeholder="Texto que o agente pode usar para responder pacientes"
        />
        {errors.conteudo && (
          <p className="text-xs text-destructive">{errors.conteudo.message}</p>
        )}
      </div>
    </FormDialog>
  )
}
