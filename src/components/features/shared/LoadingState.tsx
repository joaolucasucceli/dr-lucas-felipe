import { Skeleton } from "@/components/ui/skeleton"

interface LoadingStateProps {
  colunas?: number
  linhas?: number
}

export function LoadingState({ colunas = 5, linhas = 5 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {Array.from({ length: colunas }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
