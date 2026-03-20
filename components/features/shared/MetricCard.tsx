import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface MetricCardProps {
  titulo: string
  valor: string | number
  descricao?: string
  icone: React.ReactNode
}

export function MetricCard({ titulo, valor, descricao, icone }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <span className="text-muted-foreground">{icone}</span>
        <span className="text-sm font-medium text-muted-foreground">{titulo}</span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{valor}</p>
        {descricao && (
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        )}
      </CardContent>
    </Card>
  )
}
