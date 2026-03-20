"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts"

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

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={dados} layout="vertical" margin={{ left: 0, right: 40 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => {
            const num = Number(value) || 0
            const pct = totalGeral > 0 ? ((num / totalGeral) * 100).toFixed(1) : "0"
            return [`${num} (${pct}%)`, "Leads"]
          }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
          {dados.map((item, idx) => (
            <Cell key={idx} fill={item.cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
