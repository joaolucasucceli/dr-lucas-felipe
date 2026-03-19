import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icone?: React.ReactNode
  titulo: string
  descricao?: string
  textoBotao?: string
  onAcao?: () => void
}

export function EmptyState({
  icone,
  titulo,
  descricao,
  textoBotao,
  onAcao,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icone && (
        <div className="mb-4 text-muted-foreground">{icone}</div>
      )}
      <h3 className="text-lg font-semibold">{titulo}</h3>
      {descricao && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {descricao}
        </p>
      )}
      {textoBotao && onAcao && (
        <Button onClick={onAcao} className="mt-4">
          {textoBotao}
        </Button>
      )}
    </div>
  )
}
