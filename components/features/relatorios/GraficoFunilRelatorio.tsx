"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"

interface EtapaFunil {
  etapa: string
  label: string
  total: number
  conversao: number
  cor: string
}

interface GraficoFunilRelatorioProps {
  dados: EtapaFunil[]
}

function TooltipCustom({ active, payload }: { active?: boolean; payload?: { payload: EtapaFunil }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded border bg-background p-2 text-xs shadow">
      <p className="font-medium">{d.label}</p>
      <p>{d.total} leads</p>
      {d.conversao > 0 && <p className="text-muted-foreground">{d.conversao}% da etapa anterior</p>}
    </div>
  )
}

export function GraficoFunilRelatorio({ dados }: GraficoFunilRelatorioProps) {
  if (!dados.length) return <p className="text-sm text-muted-foreground">Sem dados</p>

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 48, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<TooltipCustom />} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {dados.map((entry) => (
            <Cell key={entry.etapa} fill={entry.cor} />
          ))}
          <LabelList
            dataKey="total"
            position="right"
            style={{ fontSize: 12, fill: "#6b7280" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
