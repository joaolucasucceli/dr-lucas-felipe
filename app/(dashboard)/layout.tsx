export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh">
      {/* Sidebar — será implementada na Sprint 1 */}
      <aside className="hidden w-64 border-r bg-muted/40 md:block">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          Central Dr. Lucas
        </div>
        <nav className="grid gap-1 p-2">
          <span className="rounded-md px-3 py-2 text-sm text-muted-foreground">
            Dashboard
          </span>
          <span className="rounded-md px-3 py-2 text-sm text-muted-foreground">
            Kanban
          </span>
          <span className="rounded-md px-3 py-2 text-sm text-muted-foreground">
            Leads
          </span>
          <span className="rounded-md px-3 py-2 text-sm text-muted-foreground">
            Agendamentos
          </span>
          <span className="rounded-md px-3 py-2 text-sm text-muted-foreground">
            Procedimentos
          </span>
          <span className="rounded-md px-3 py-2 text-sm text-muted-foreground">
            Usuários
          </span>
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1">
        <header className="flex h-14 items-center border-b px-4 md:px-6">
          <span className="text-sm text-muted-foreground">
            Logado como: —
          </span>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
