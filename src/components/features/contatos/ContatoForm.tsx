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

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  whatsapp: z.string().regex(/^\d{10,13}$/, "WhatsApp: apenas digitos (10-13)"),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  procedimentoInteresse: z.string().optional(),
  origem: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Procedimento {
  id: string
  nome: string
}

interface ContatoFormProps {
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
  procedimentos: Procedimento[]
}

export function ContatoForm({
  aberto,
  onFechar,
  onSucesso,
  procedimentos,
}: ContatoFormProps) {
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
      whatsapp: "",
      email: "",
      procedimentoInteresse: "",
      origem: "",
    },
  })

  useEffect(() => {
    if (!aberto) {
      reset()
    }
  }, [aberto, reset])

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset()
      onFechar()
    }
  }

  async function onSubmit(data: FormData) {
    const body: Record<string, unknown> = {
      nome: data.nome,
      whatsapp: data.whatsapp,
      tipo: "paciente",
    }

    if (data.email) body.email = data.email
    if (data.procedimentoInteresse) body.procedimentoInteresse = data.procedimentoInteresse
    if (data.origem) body.origem = data.origem

    try {
      const res = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao criar paciente")
        return
      }

      toast.success("Paciente criado")
      reset()
      onSucesso()
    } catch {
      toast.error("Erro ao criar paciente")
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contato-nome">Nome</Label>
            <Input id="contato-nome" {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contato-whatsapp">
              WhatsApp <span className="text-muted-foreground font-normal text-xs">(somente digitos)</span>
            </Label>
            <Input
              id="contato-whatsapp"
              placeholder="11999998888"
              {...register("whatsapp")}
            />
            {errors.whatsapp && (
              <p className="text-xs text-destructive">{errors.whatsapp.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contato-email">
              Email <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </Label>
            <Input id="contato-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>
              Procedimento de Interesse <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </Label>
            <Select
              onValueChange={(v) => setValue("procedimentoInteresse", v === "nenhum" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                {procedimentos.map((p) => (
                  <SelectItem key={p.id} value={p.nome}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>
              Origem <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </Label>
            <Select onValueChange={(v) => setValue("origem", v === "outro" ? "Outro" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Como nos encontrou?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Indicacao">Indicacao</SelectItem>
                <SelectItem value="Site">Site</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
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
                  Criando...
                </>
              ) : (
                "Criar paciente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
