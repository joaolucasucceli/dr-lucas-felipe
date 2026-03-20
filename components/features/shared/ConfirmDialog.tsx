"use client"

import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  titulo: string
  descricao: string
  aberto: boolean
  onFechar: () => void
  onConfirmar: () => void
  variante?: "destrutivo" | "padrao"
  textoBotao?: string
  carregando?: boolean
}

export function ConfirmDialog({
  titulo,
  descricao,
  aberto,
  onFechar,
  onConfirmar,
  variante = "padrao",
  textoBotao = "Confirmar",
  carregando = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={aberto} onOpenChange={carregando ? undefined : onFechar}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirmar()
            }}
            disabled={carregando}
            className={
              variante === "destrutivo"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {carregando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aguarde...
              </>
            ) : (
              textoBotao
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
