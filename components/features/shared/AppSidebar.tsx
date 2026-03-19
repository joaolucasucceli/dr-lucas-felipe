"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Kanban,
  Users,
  UserSearch,
  CalendarDays,
  Stethoscope,
  Map,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"

interface NavItem {
  titulo: string
  href: string
  icone: React.ReactNode
  perfis?: string[]
}

const navItems: NavItem[] = [
  {
    titulo: "Dashboard",
    href: "/dashboard",
    icone: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    titulo: "Kanban",
    href: "/kanban",
    icone: <Kanban className="h-4 w-4" />,
  },
  {
    titulo: "Leads",
    href: "/leads",
    icone: <UserSearch className="h-4 w-4" />,
  },
  {
    titulo: "Agendamentos",
    href: "/agendamentos",
    icone: <CalendarDays className="h-4 w-4" />,
  },
  {
    titulo: "Procedimentos",
    href: "/procedimentos",
    icone: <Stethoscope className="h-4 w-4" />,
  },
  {
    titulo: "Usuários",
    href: "/usuarios",
    icone: <Users className="h-4 w-4" />,
    perfis: ["gestor", "desenvolvedor"],
  },
  {
    titulo: "Roadmap",
    href: "/roadmap",
    icone: <Map className="h-4 w-4" />,
    perfis: ["desenvolvedor"],
  },
]

interface AppSidebarProps {
  perfil: string
}

function NavContent({ perfil }: { perfil: string }) {
  const pathname = usePathname()

  const itensVisiveis = navItems.filter(
    (item) => !item.perfis || item.perfis.includes(perfil)
  )

  return (
    <nav className="grid gap-1 p-2">
      {itensVisiveis.map((item) => {
        const ativo = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              ativo
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.icone}
            {item.titulo}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppSidebar({ perfil }: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-muted/40 md:block">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          Central Dr. Lucas
        </div>
        <ScrollArea className="h-[calc(100svh-3.5rem)]">
          <NavContent perfil={perfil} />
        </ScrollArea>
      </aside>

      {/* Mobile sidebar trigger (rendered in header) */}
    </>
  )
}

export function MobileSidebarTrigger({ perfil }: AppSidebarProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="flex h-14 items-center border-b px-4 font-semibold">
          Central Dr. Lucas
        </SheetTitle>
        <ScrollArea className="h-[calc(100svh-3.5rem)]">
          <NavContent perfil={perfil} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
