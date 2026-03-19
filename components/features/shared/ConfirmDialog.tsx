"use client"

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
}

export function ConfirmDialog({
  titulo,
  descricao,
  aberto,
  onFechar,
  onConfirmar,
  variante = "padrao",
  textoBotao = "Confirmar",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={aberto} onOpenChange={onFechar}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmar}
            className={
              variante === "destrutivo"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {textoBotao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
