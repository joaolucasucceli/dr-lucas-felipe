"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").or(z.literal("")),
  perfil: z.enum(["gestor", "atendente"]),
})

type FormData = z.infer<typeof formSchema>

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string
  tipo: string
  ativo: boolean
}

interface UsuarioFormProps {
  usuario?: Usuario | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function UsuarioForm({
  usuario,
  aberto,
  onFechar,
  onSucesso,
}: UsuarioFormProps) {
  const editando = !!usuario

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: usuario?.nome || "",
      email: usuario?.email || "",
      senha: "",
      perfil: (usuario?.perfil as FormData["perfil"]) || "atendente",
    },
  })

  useEffect(() => {
    if (usuario) {
      reset({
        nome: usuario.nome,
        email: usuario.email,
        senha: "",
        perfil: usuario.perfil as FormData["perfil"],
      })
    } else {
      reset({ nome: "", email: "", senha: "", perfil: "atendente" })
    }
  }, [usuario, reset])

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset()
      onFechar()
    }
  }

  async function onSubmit(data: FormData) {
    const body: Record<string, unknown> = {
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,
    }

    if (data.senha) {
      body.senha = data.senha
    } else if (!editando) {
      toast.error("Senha é obrigatória para novos usuários")
      return
    }

    try {
      const url = editando ? `/api/usuarios/${usuario.id}` : "/api/usuarios"
      const method = editando ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao salvar usuário")
        return
      }

      toast.success(editando ? "Usuário atualizado" : "Usuário criado")
      reset()
      onSucesso()
    } catch {
      toast.error("Erro ao salvar usuário")
    }
  }

  return (
    <FormDialog
      aberto={aberto}
      onFechar={() => handleOpenChange(false)}
      titulo="Usuário"
      editando={editando}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      largura="sm"
    >
      <div className="grid gap-2">
        <Label htmlFor="form-nome">Nome</Label>
        <Input id="form-nome" {...register("nome")} />
        {errors.nome && (
          <p className="text-xs text-destructive">{errors.nome.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="form-email">Email</Label>
        <Input id="form-email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="form-senha">
          Senha{editando && " (deixe vazio para manter)"}
        </Label>
        <Input id="form-senha" type="password" {...register("senha")} />
        {errors.senha && (
          <p className="text-xs text-destructive">{errors.senha.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Perfil</Label>
        <Select
          defaultValue={usuario?.perfil || "atendente"}
          onValueChange={(v) => setValue("perfil", v as FormData["perfil"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="atendente">Atendente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FormDialog>
  )
}
