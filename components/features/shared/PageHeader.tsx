interface PageHeaderProps {
  titulo: string
  descricao?: string
  children?: React.ReactNode
}

export function PageHeader({ titulo, descricao, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {descricao && (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
