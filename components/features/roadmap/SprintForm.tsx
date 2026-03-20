"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Sprint } from "@/hooks/use-sprints"

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  status: z.string(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface SprintFormProps {
  sprint?: Sprint | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toISOString().split("T")[0]
}

export function SprintForm({ sprint, aberto, onFechar, onSucesso }: SprintFormProps) {
  const editando = !!sprint

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
      descricao: "",
      status: "planejada",
      dataInicio: "",
      dataFim: "",
    },
  })

  useEffect(() => {
    if (sprint) {
      reset({
        nome: sprint.nome,
        descricao: sprint.descricao || "",
        status: sprint.status,
        dataInicio: toDateInputValue(sprint.dataInicio),
        dataFim: toDateInputValue(sprint.dataFim),
      })
    } else {
      reset({
        nome: "",
        descricao: "",
        status: "planejada",
        dataInicio: "",
        dataFim: "",
      })
    }
  }, [sprint, reset])

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset()
      onFechar()
    }
  }

  async function onSubmit(data: FormData) {
    const body: Record<string, unknown> = {
      nome: data.nome,
      status: data.status,
    }

    if (data.descricao) body.descricao = data.descricao
    if (data.dataInicio) body.dataInicio = new Date(data.dataInicio).toISOString()
    if (data.dataFim) body.dataFim = new Date(data.dataFim).toISOString()

    try {
      const url = editando ? `/api/sprints/${sprint.id}` : "/api/sprints"
      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao salvar sprint")
        return
      }

      toast.success(editando ? "Sprint atualizada" : "Sprint criada")
      reset()
      onSucesso()
    } catch {
      toast.error("Erro ao salvar sprint")
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar Sprint" : "Nova Sprint"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sprint-nome">Nome</Label>
            <Input id="sprint-nome" {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sprint-descricao">Descrição</Label>
            <Textarea id="sprint-descricao" {...register("descricao")} />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              defaultValue={sprint?.status || "planejada"}
              onValueChange={(v) => setValue("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejada">Planejada</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sprint-inicio">Data Início</Label>
              <Input id="sprint-inicio" type="date" {...register("dataInicio")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sprint-fim">Data Fim</Label>
              <Input id="sprint-fim" type="date" {...register("dataFim")} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editando ? (
                "Salvar"
              ) : (
                "Criar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
