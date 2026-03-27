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
import { Checkbox } from "@/components/ui/checkbox"
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
  whatsapp: z
    .string()
    .regex(/^\d{10,13}$/, "WhatsApp: apenas dígitos (10-13)")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF: exatamente 11 dígitos")
    .optional()
    .or(z.literal("")),
  dataNascimento: z.string().optional().or(z.literal("")),
  sexo: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  contatoEmergencia: z.string().optional(),
  contatoEmergenciaTel: z.string().optional(),
  consentimentoLgpd: z.boolean().optional(),
})

type FormData = z.infer<typeof formSchema>

interface PacienteFormProps {
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function PacienteForm({ aberto, onFechar, onSucesso }: PacienteFormProps) {
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
      nome: "",
      whatsapp: "",
      email: "",
      cpf: "",
      dataNascimento: "",
      sexo: "",
      endereco: "",
      cidade: "",
      estado: "",
      contatoEmergencia: "",
      contatoEmergenciaTel: "",
      consentimentoLgpd: false,
    },
  })

  const consentimento = watch("consentimentoLgpd")

  useEffect(() => {
    if (!aberto) reset()
  }, [aberto, reset])

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset()
      onFechar()
    }
  }

  async function onSubmit(data: FormData) {
    const body: Record<string, unknown> = { nome: data.nome }

    if (data.whatsapp) body.whatsapp = data.whatsapp
    if (data.email) body.email = data.email
    if (data.cpf) body.cpf = data.cpf
    if (data.dataNascimento) body.dataNascimento = data.dataNascimento
    if (data.sexo && data.sexo !== "nenhum") body.sexo = data.sexo
    if (data.endereco) body.endereco = data.endereco
    if (data.cidade) body.cidade = data.cidade
    if (data.estado) body.estado = data.estado
    if (data.contatoEmergencia) body.contatoEmergencia = data.contatoEmergencia
    if (data.contatoEmergenciaTel) body.contatoEmergenciaTel = data.contatoEmergenciaTel
    if (data.consentimentoLgpd) body.consentimentoLgpd = true

    try {
      const res = await fetch("/api/pacientes", {
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pac-nome">Nome *</Label>
            <Input id="pac-nome" {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pac-whatsapp">
                WhatsApp <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <Input id="pac-whatsapp" placeholder="11999998888" {...register("whatsapp")} />
              {errors.whatsapp && (
                <p className="text-xs text-destructive">{errors.whatsapp.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pac-email">
                Email <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <Input id="pac-email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pac-cpf">
                CPF <span className="text-muted-foreground font-normal text-xs">(11 dígitos)</span>
              </Label>
              <Input id="pac-cpf" placeholder="00000000000" {...register("cpf")} />
              {errors.cpf && (
                <p className="text-xs text-destructive">{errors.cpf.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pac-nascimento">Data de Nascimento</Label>
              <Input id="pac-nascimento" type="date" {...register("dataNascimento")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Sexo</Label>
            <Select onValueChange={(v) => setValue("sexo", v === "nenhum" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Não informado</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="masculino">Masculino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pac-endereco">Endereço</Label>
            <Input id="pac-endereco" {...register("endereco")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pac-cidade">Cidade</Label>
              <Input id="pac-cidade" {...register("cidade")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pac-estado">Estado</Label>
              <Input id="pac-estado" placeholder="SP" {...register("estado")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pac-emergencia">Contato de Emergência</Label>
              <Input id="pac-emergencia" {...register("contatoEmergencia")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pac-emergencia-tel">Tel. Emergência</Label>
              <Input id="pac-emergencia-tel" {...register("contatoEmergenciaTel")} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="pac-lgpd"
              checked={consentimento}
              onCheckedChange={(v) => setValue("consentimentoLgpd", !!v)}
            />
            <Label htmlFor="pac-lgpd" className="text-sm font-normal">
              Paciente consente com o tratamento de dados pessoais (LGPD)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
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
