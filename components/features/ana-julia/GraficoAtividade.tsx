"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface AtividadeDia {
  data: string
  enviadas: number
  recebidas: number
}

interface GraficoAtividadeProps {
  dados: AtividadeDia[]
}

function formatarData(data: string) {
  const [, mes, dia] = data.split("-")
  return `${dia}/${mes}`
}

export function GraficoAtividade({ dados }: GraficoAtividadeProps) {
  if (dados.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Sem atividade no período
      </div>
    )
  }

  const dadosFormatados = dados.map((d) => ({
    ...d,
    dataFormatada: formatarData(d.data),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dadosFormatados} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dataFormatada" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [
            value,
            name === "enviadas" ? "Enviadas (IA)" : "Recebidas",
          ]}
          labelFormatter={(label) => `Dia ${label}`}
        />
        <Legend
          formatter={(value) => (value === "enviadas" ? "Enviadas (IA)" : "Recebidas")}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="enviadas" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
        <Bar dataKey="recebidas" fill="#86efac" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
