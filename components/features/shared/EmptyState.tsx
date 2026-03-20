import { Inbox } from "lucide-react"
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
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="text-muted-foreground">
        {icone ?? <Inbox className="h-12 w-12" />}
      </div>
      <h3 className="text-lg font-semibold">{titulo}</h3>
      {descricao && (
        <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>
      )}
      {textoBotao && onAcao && (
        <Button onClick={onAcao} className="mt-2">
          {textoBotao}
        </Button>
      )}
    </div>
  )
}
