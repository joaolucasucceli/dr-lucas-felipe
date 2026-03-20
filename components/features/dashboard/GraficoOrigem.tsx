"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface DadoOrigem {
  origem: string
  total: number
}

interface GraficoOrigemProps {
  dados: DadoOrigem[]
}

const coresOrigem: Record<string, string> = {
  whatsapp: "#25D366",
  instagram: "#E1306C",
  indicação: "#6366f1",
  indicacao: "#6366f1",
  site: "#3b82f6",
}

const corPadrao = "#94a3b8"

export function GraficoOrigem({ dados }: GraficoOrigemProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={dados}
          dataKey="total"
          nameKey="origem"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {dados.map((item, idx) => (
            <Cell
              key={idx}
              fill={
                coresOrigem[item.origem.toLowerCase()] || corPadrao
              }
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
