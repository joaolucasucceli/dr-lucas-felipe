"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Kanban,
  UserSearch,
  Stethoscope,
  Brain,
  Film,
  HeartPulse,
  BrainCog,
  Sparkles,
  Calendar,
  CalendarDays,
  MessageCircle,
  Globe,
  Users,
  Tags,
  LogOut,
  Menu,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserAvatar } from "@/components/features/shared/UserAvatar"
import { cn } from "@/lib/utils"
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
    label: "Comercial",
    itens: [
      {
        titulo: "Atendimentos",
        href: "/atendimentos",
        icone: <Kanban className="h-4 w-4" />,
      },
      {
        titulo: "Agenda",
        href: "/agenda",
        icone: <Calendar className="h-4 w-4" />,
      },
      {
        titulo: "Contatos",
        href: "/contatos",
        icone: <UserSearch className="h-4 w-4" />,
      },
      {
        titulo: "Mídia Marketing",
        href: "/midia-marketing",
        icone: <Film className="h-4 w-4" />,
        perfis: ["gestor"],
      },
    ],
  },
  {
    label: "Operacional",
    itens: [
      {
        titulo: "Procedimentos",
        href: "/procedimentos",
        icone: <Stethoscope className="h-4 w-4" />,
        perfis: ["gestor"],
      },
      {
        titulo: "Base de Conhecimento",
        href: "/base-conhecimento",
        icone: <Brain className="h-4 w-4" />,
        perfis: ["gestor"],
      },
    ],
  },
  {
    label: "Colaboradores",
    itens: [
      {
        titulo: "Ana Júlia",
        href: "/ana-julia",
        icone: <Sparkles className="h-4 w-4" />,
      },
      {
        titulo: "Eduarda",
        href: "/eduarda",
        icone: <BrainCog className="h-4 w-4" />,
        perfis: ["gestor"],
      },
    ],
  },
  {
    label: "Sistema",
    itens: [
      {
        titulo: "Google Agenda",
        href: "/configuracoes/google-agenda",
        icone: <CalendarDays className="h-4 w-4" />,
        perfis: ["gestor"],
      },
      {
        titulo: "WhatsApp",
        href: "/configuracoes/whatsapp",
        icone: <MessageCircle className="h-4 w-4" />,
        perfis: ["gestor"],
      },
      {
        titulo: "Site",
        href: "/configuracoes/site",
        icone: <Globe className="h-4 w-4" />,
        perfis: ["gestor"],
      },
      {
        titulo: "Usuários",
        href: "/configuracoes/usuarios",
        icone: <Users className="h-4 w-4" />,
        perfis: ["gestor"],
      },
      {
        titulo: "Tipos de Procedimento",
        href: "/configuracoes/tipos-procedimento",
        icone: <Tags className="h-4 w-4" />,
        perfis: ["gestor"],
      },
    ],
  },
]

const perfilLabels: Record<string, string> = {
  gestor: "Gestor",
  atendente: "Atendente",
}

interface AppSidebarProps {
  perfil: string
  nome: string
  email: string
  fotoUrl?: string | null
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
            <span className="px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground">
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
                    <span
                      className="ml-auto h-2 w-2 rounded-full bg-primary"
                      aria-label="Ha atendimentos nao lidos"
                    />
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

function ContaFooter({ nome, email, perfil, fotoUrl }: { nome: string; email: string; perfil: string; fotoUrl?: string | null }) {
  return (
    <div className="border-t p-2">
      <div className="flex items-center gap-2 px-2 py-2">
        <UserAvatar nome={nome} src={fotoUrl} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{nome}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {perfilLabels[perfil] || perfil}
        </Badge>
      </div>
      <div className="mt-1 grid gap-1">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  )
}

export function AppSidebar({ perfil, nome, email, fotoUrl }: AppSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/40 md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <HeartPulse className="h-5 w-5 text-primary" />
        Central Dr. Lucas
      </div>
      <ScrollArea className="flex-1">
        <NavContent perfil={perfil} />
      </ScrollArea>
      <ContaFooter nome={nome} email={email} perfil={perfil} fotoUrl={fotoUrl} />
    </aside>
  )
}

export function MobileSidebarTrigger({ perfil, nome, email, fotoUrl }: AppSidebarProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-64 flex-col p-0">
        <SheetTitle className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          <HeartPulse className="h-5 w-5 text-primary" />
          Central Dr. Lucas
        </SheetTitle>
        <ScrollArea className="flex-1">
          <NavContent perfil={perfil} />
        </ScrollArea>
        <ContaFooter nome={nome} email={email} perfil={perfil} fotoUrl={fotoUrl} />
      </SheetContent>
    </Sheet>
  )
}
