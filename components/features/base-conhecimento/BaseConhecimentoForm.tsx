"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormDialog } from "@/components/features/shared/FormDialog"

const formSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  conteudo: z.string().min(5, "Conteúdo deve ter pelo menos 5 caracteres"),
})

type FormData = z.infer<typeof formSchema>

interface BaseConhecimento {
  id: string
  titulo: string
  conteudo: string
}

interface BaseConhecimentoFormProps {
  registro?: BaseConhecimento | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
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
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { titulo: "", conteudo: "" },
  })

  useEffect(() => {
    if (registro) {
      reset({ titulo: registro.titulo, conteudo: registro.conteudo })
    } else {
      reset({ titulo: "", conteudo: "" })
    }
  }, [registro, reset])

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset()
      onFechar()
    }
  }

  async function onSubmit(data: FormData) {
    try {
      const url = editando
        ? `/api/base-conhecimento/${registro.id}`
        : "/api/base-conhecimento"
      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
      <p className="text-xs text-muted-foreground leading-relaxed">
        Use para informações que a Ana Júlia precisa consultar (endereço, formas de pagamento, formação do Dr. Lucas, pós-operatório). Não use para scripts ou regras de comportamento — isso fica no prompt da IA.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="bc-titulo">Título</Label>
        <Input id="bc-titulo" {...register("titulo")} />
        {errors.titulo && (
          <p className="text-xs text-destructive">{errors.titulo.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bc-conteudo">Conteúdo</Label>
        <Textarea
          id="bc-conteudo"
          className="min-h-[180px] max-h-[400px]"
          {...register("conteudo")}
          placeholder="Texto que a Ana Júlia pode usar para responder pacientes"
        />
        {errors.conteudo && (
          <p className="text-xs text-destructive">{errors.conteudo.message}</p>
        )}
      </div>
    </FormDialog>
  )
}
