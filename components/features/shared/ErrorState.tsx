"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  mensagem?: string
  onTentar?: () => void
}

export function ErrorState({
  mensagem = "Ocorreu um erro ao carregar os dados.",
  onTentar,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <p className="text-sm text-muted-foreground">{mensagem}</p>
      {onTentar && (
        <Button variant="outline" onClick={onTentar} className="mt-4">
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
