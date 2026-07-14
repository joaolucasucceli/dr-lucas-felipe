import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonTabelaProps {
  linhas?: number
  colunas?: number
}

export function SkeletonTabela({ linhas = 5, colunas = 4 }: SkeletonTabelaProps) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: colunas }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: linhas }).map((_, row) => (
        <div key={row} className="flex gap-4 py-2">
          {Array.from({ length: colunas }).map((_, col) => (
            <Skeleton
              key={col}
              className="h-4 flex-1"
              style={{ opacity: 1 - row * 0.12 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
