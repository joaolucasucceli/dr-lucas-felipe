import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Feature {
  icone: React.ReactNode
  titulo: string
  descricao: string
}

interface FeaturesGridProps {
  features: Feature[]
}

export function FeaturesGrid({ features }: FeaturesGridProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Funcionalidades
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="border-muted">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">{feature.icone}</span>
                {feature.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.descricao}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
