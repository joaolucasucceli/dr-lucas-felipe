"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Kanban,
  UserSearch,
  Users,
  CalendarDays,
  Stethoscope,
  Settings,
  BookOpen,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"
import { useNaoLidas } from "@/hooks/use-nao-lidas"

interface NavItem {
  titulo: string
  href: string
  icone: React.ReactNode
  perfis?: string[]
}

interface NavGroup {
  label: string
  itens: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Geral",
    itens: [
      {
        titulo: "Dashboard",
        href: "/dashboard",
        icone: <LayoutDashboard className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Operacional",
    itens: [
      {
        titulo: "Atendimentos",
        href: "/atendimentos",
        icone: <Kanban className="h-4 w-4" />,
      },
      {
        titulo: "Leads",
        href: "/leads",
        icone: <UserSearch className="h-4 w-4" />,
      },
      {
        titulo: "Pacientes",
        href: "/pacientes",
        icone: <Users className="h-4 w-4" />,
        perfis: ["gestor"],
      },
      {
        titulo: "Agendamentos",
        href: "/agendamentos",
        icone: <CalendarDays className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Clínica",
    itens: [
      {
        titulo: "Procedimentos",
        href: "/procedimentos",
        icone: <Stethoscope className="h-4 w-4" />,
        perfis: ["gestor"],
      },
    ],
  },
  {
    label: "Sistema",
    itens: [
      {
        titulo: "Configurações",
        href: "/configuracoes",
        icone: <Settings className="h-4 w-4" />,
        perfis: ["gestor"],
      },
      {
        titulo: "Documentação",
        href: "/documentacao",
        icone: <BookOpen className="h-4 w-4" />,
      },
    ],
  },
]

interface AppSidebarProps {
  perfil: string
}

function NavContent({ perfil }: { perfil: string }) {
  const pathname = usePathname()
  const naoLidas = useNaoLidas()

  return (
    <nav className="grid gap-1 p-2">
      {navGroups.map((grupo, index) => {
        const itensVisiveis = grupo.itens.filter(
          (item) => !item.perfis || item.perfis.includes(perfil)
        )

        if (itensVisiveis.length === 0) return null

        return (
          <div key={grupo.label} className={cn(index > 0 && "mt-4")}>
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {grupo.label}
            </span>
            {itensVisiveis.map((item) => {
              const ativo = pathname === item.href || pathname.startsWith(item.href + "/")
              const ehAtendimentos = item.href === "/atendimentos"
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
                  {ehAtendimentos && naoLidas > 0 && (
                    <Badge variant="default" className="ml-auto h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5">
                      {naoLidas > 99 ? "99+" : naoLidas}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>
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
