"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

interface FunilIA {
  leadsRecebidos: number
  qualificados: number
  agendados: number
  realizados: number
}

interface CardFunilIAProps {
  funil: FunilIA
}

function pct(parte: number, total: number) {
  if (total === 0) return "—"
  return `${Math.round((parte / total) * 100)}%`
}

interface EtapaProps {
  rotulo: string
  valor: number
  percentual: string
  cor: string
}

function Etapa({ rotulo, valor, percentual, cor }: EtapaProps) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
        style={{ backgroundColor: cor }}
      >
        {valor}
      </div>
      <span className="text-center text-xs font-medium leading-tight">{rotulo}</span>
      {percentual !== "—" && (
        <span className="text-xs text-muted-foreground">{percentual}</span>
      )}
    </div>
  )
}

export function CardFunilIA({ funil }: CardFunilIAProps) {
  const { leadsRecebidos, qualificados, agendados, realizados } = funil

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <Etapa
            rotulo="Recebidos"
            valor={leadsRecebidos}
            percentual="—"
            cor="#6366f1"
          />
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Etapa
            rotulo="Qualificados"
            valor={qualificados}
            percentual={pct(qualificados, leadsRecebidos)}
            cor="#8b5cf6"
          />
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Etapa
            rotulo="Agendados"
            valor={agendados}
            percentual={pct(agendados, qualificados)}
            cor="#a78bfa"
          />
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Etapa
            rotulo="Realizados"
            valor={realizados}
            percentual={pct(realizados, agendados)}
            cor="#22c55e"
          />
        </div>
      </CardContent>
    </Card>
  )
}
