"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface PontoTemporal {
  label: string
  total: number
  realizados: number
  cancelados: number
}

interface GraficoReceitaTemporalProps {
  dados: PontoTemporal[]
}

export function GraficoReceitaTemporal({ dados }: GraficoReceitaTemporalProps) {
  if (!dados.length) return <p className="text-sm text-muted-foreground">Sem dados</p>

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dados} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="total" name="Total" stroke="#a5b4fc" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="realizados" name="Realizados" stroke="#86efac" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cancelados" name="Cancelados" stroke="#fca5a5" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
