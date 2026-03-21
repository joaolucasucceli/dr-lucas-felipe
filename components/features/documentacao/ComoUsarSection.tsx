interface Passo {
  numero: number
  titulo: string
  descricao: string
}

interface ComoUsarSectionProps {
  passos: Passo[]
}

export function ComoUsarSection({ passos }: ComoUsarSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Como usar
      </h3>
      <div className="space-y-4">
        {passos.map((passo) => (
          <div key={passo.numero} className="flex gap-4">
            <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {passo.numero}
            </div>
            <div className="pt-0.5">
              <p className="text-sm font-semibold">{passo.titulo}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{passo.descricao}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
