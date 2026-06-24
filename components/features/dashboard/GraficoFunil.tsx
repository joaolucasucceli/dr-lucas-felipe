"use client"

interface DadoFunil {
  etapa: string
  label: string
  total: number
  cor: string
}

interface GraficoFunilProps {
  dados: DadoFunil[]
}

export function GraficoFunil({ dados }: GraficoFunilProps) {
  const totalGeral = dados.reduce((acc, d) => acc + d.total, 0)
  const maiorTotal = Math.max(...dados.map((d) => d.total), 1)

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background/40 p-4">
      {dados.map((item) => {
        const percentual =
          totalGeral > 0 ? Math.round((item.total / totalGeral) * 100) : 0
        const largura = Math.max(
          (item.total / maiorTotal) * 100,
          item.total > 0 ? 8 : 0
        )

        return (
          <div key={item.etapa} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.cor }}
                />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <div className="flex items-baseline gap-2 text-right">
                <span className="text-sm font-semibold">{item.total}</span>
                <span className="text-xs text-muted-foreground">
                  {percentual}%
                </span>
              </div>
            </div>

            <div
              className="h-7 overflow-hidden rounded-md bg-muted"
              role="img"
              aria-label={`${item.label}: ${item.total} leads, ${percentual}% do funil`}
            >
              <div
                className="h-full rounded-md"
                style={{
                  width: `${largura}%`,
                  backgroundColor: item.cor,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
