"use client"

import type { FormEventHandler, ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Largura = "sm" | "md" | "lg" | "xl"

const LARGURAS: Record<Largura, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
}

interface FormDialogProps {
  aberto: boolean
  onFechar: () => void
  titulo: string
  editando?: boolean
  isSubmitting?: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
  className?: string
  largura?: Largura
  textoSalvar?: string
  textoCriar?: string
  desabilitarSalvar?: boolean
}

export function FormDialog({
  aberto,
  onFechar,
  titulo,
  editando = false,
  isSubmitting = false,
  onSubmit,
  children,
  className,
  largura = "md",
  textoSalvar = "Salvar",
  textoCriar = "Criar",
  desabilitarSalvar = false,
}: FormDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className={cn(LARGURAS[largura], className)}>
        <DialogHeader>
          <DialogTitle>
            {editando ? `Editar ${titulo}` : `Novo ${titulo}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || desabilitarSalvar}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editando ? textoSalvar : textoCriar}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
