"use client"

interface ProcedimentoItem {
  nome: string
  quantidade: number
  percentual: number
}

interface TabelaProcedimentosProps {
  dados: ProcedimentoItem[]
}

export function TabelaProcedimentos({ dados }: TabelaProcedimentosProps) {
  if (!dados.length) return <p className="text-sm text-muted-foreground">Sem dados</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Procedimento</th>
            <th className="pb-2 font-medium text-right">Agendamentos</th>
            <th className="pb-2 font-medium text-right">% do total</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((p) => (
            <tr key={p.nome} className="border-b last:border-0">
              <td className="py-2">{p.nome}</td>
              <td className="py-2 text-right">{p.quantidade}</td>
              <td className="py-2 text-right text-muted-foreground">{p.percentual}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
