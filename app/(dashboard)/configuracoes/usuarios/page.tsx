"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, MoreHorizontal, Pencil, UserX, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { DataTable, type ColunaConfig } from "@/components/features/shared/DataTable"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { UsuarioForm } from "@/components/features/usuarios/UsuarioForm"
import { useUsuarios } from "@/hooks/use-usuarios"

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string
  tipo: string
  ativo: boolean
  criadoEm: string
}

const perfilLabels: Record<string, string> = {
  gestor: "Gestor",
  atendente: "Atendente",
}

const tipoLabels: Record<string, string> = {
  humano: "Humano",
  ia: "IA",
}

export default function UsuariosPage() {
  const { data: session } = useSession()
  const [pagina, setPagina] = useState(1)
  const [filtroPerfil, setFiltroPerfil] = useState<string>("")
  const [filtroAtivo, setFiltroAtivo] = useState<string>("")

  const [formAberto, setFormAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)

  const [confirmAberto, setConfirmAberto] = useState(false)
  const [usuarioAlvo, setUsuarioAlvo] = useState<Usuario | null>(null)

  const { dados, total, carregando, erro, recarregar } = useUsuarios({
    pagina,
    porPagina: 10,
    perfil: filtroPerfil || undefined,
    ativo: filtroAtivo || undefined,
  })

  const isGestor = session?.user?.perfil === "gestor"

  function handleEditar(usuario: Usuario) {
    setUsuarioEditando(usuario)
    setFormAberto(true)
  }

  function handleToggleAtivo(usuario: Usuario) {
    setUsuarioAlvo(usuario)
    setConfirmAberto(true)
  }

  async function confirmarToggleAtivo() {
    if (!usuarioAlvo) return

    try {
      const res = await fetch(`/api/usuarios/${usuarioAlvo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !usuarioAlvo.ativo }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao atualizar usuário")
        return
      }

      toast.success(
        usuarioAlvo.ativo ? "Usuário desativado" : "Usuário ativado"
      )
      recarregar()
    } catch {
      toast.error("Erro ao atualizar usuário")
    } finally {
      setConfirmAberto(false)
      setUsuarioAlvo(null)
    }
  }

  const colunas: ColunaConfig<Usuario>[] = [
    {
      chave: "nome",
      titulo: "Nome",
      ordenavel: true,
      renderizar: (u) => (
        <div className="flex items-center gap-2">
          {u.nome}
          {u.id === session?.user?.id && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Você</Badge>
          )}
        </div>
      ),
    },
    {
      chave: "email",
      titulo: "Email",
      classesCelula: "hidden sm:table-cell",
    },
    {
      chave: "perfil",
      titulo: "Perfil",
      renderizar: (u) => (
        <Badge variant="secondary">{perfilLabels[u.perfil] || u.perfil}</Badge>
      ),
    },
    {
      chave: "tipo",
      titulo: "Tipo",
      classesCelula: "hidden md:table-cell",
      renderizar: (u) => (
        <Badge variant={u.tipo === "ia" ? "default" : "outline"}>
          {tipoLabels[u.tipo] || u.tipo}
        </Badge>
      ),
    },
    {
      chave: "ativo",
      titulo: "Status",
      renderizar: (u) => (
        <Badge variant={u.ativo ? "default" : "destructive"}>
          {u.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      chave: "criadoEm",
      titulo: "Criado em",
      classesCelula: "hidden lg:table-cell",
      renderizar: (u) =>
        new Date(u.criadoEm).toLocaleDateString("pt-BR"),
    },
    ...(isGestor
      ? [
          {
            chave: "acoes" as keyof Usuario,
            titulo: "",
            renderizar: (u: Usuario) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditar(u)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  {u.tipo !== "ia" && (
                    <DropdownMenuItem onClick={() => handleToggleAtivo(u)}>
                      {u.ativo ? (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColunaConfig<Usuario>,
        ]
      : []),
  ]

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Usuários" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Usuários" descricao="Gerencie os usuários do sistema">
        {isGestor && (
          <Button
            onClick={() => {
              setUsuarioEditando(null)
              setFormAberto(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </PageHeader>

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={5} colunas={5} />
        ) : !carregando && dados.length === 0 ? (
          <EmptyState
            titulo="Nenhum usuário cadastrado"
            descricao="Adicione usuários para dar acesso ao sistema."
            textoBotao={isGestor ? "Novo Usuário" : undefined}
            onAcao={isGestor ? () => { setUsuarioEditando(null); setFormAberto(true) } : undefined}
          />
        ) : (
        <DataTable
          colunas={colunas}
          dados={dados}
          total={total}
          pagina={pagina}
          porPagina={10}
          onPaginaChange={setPagina}
          carregando={carregando}
          filtros={
            <>
              <Select
                value={filtroPerfil}
                onValueChange={(v) => {
                  setFiltroPerfil(v === "todos" ? "" : v)
                  setPagina(1)
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todos os perfis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os perfis</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filtroAtivo}
                onValueChange={(v) => {
                  setFiltroAtivo(v === "todos" ? "" : v)
                  setPagina(1)
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="true">Ativos</SelectItem>
                  <SelectItem value="false">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
        )}
      </div>

      <UsuarioForm
        usuario={usuarioEditando}
        aberto={formAberto}
        onFechar={() => {
          setFormAberto(false)
          setUsuarioEditando(null)
        }}
        onSucesso={() => {
          setFormAberto(false)
          setUsuarioEditando(null)
          recarregar()
        }}
      />

      <ConfirmDialog
        titulo={
          usuarioAlvo?.ativo ? "Desativar usuário" : "Ativar usuário"
        }
        descricao={
          usuarioAlvo?.ativo
            ? `Tem certeza que deseja desativar ${usuarioAlvo?.nome}? O usuário não poderá mais acessar o sistema.`
            : `Tem certeza que deseja reativar ${usuarioAlvo?.nome}?`
        }
        aberto={confirmAberto}
        onFechar={() => {
          setConfirmAberto(false)
          setUsuarioAlvo(null)
        }}
        onConfirmar={confirmarToggleAtivo}
        variante={usuarioAlvo?.ativo ? "destrutivo" : "padrao"}
        textoBotao={usuarioAlvo?.ativo ? "Desativar" : "Ativar"}
      />
    </div>
  )
}
