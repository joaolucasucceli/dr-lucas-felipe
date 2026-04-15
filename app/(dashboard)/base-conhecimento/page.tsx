"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Plus, MoreHorizontal, Pencil, EyeOff, Eye, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { BaseConhecimentoForm } from "@/components/features/base-conhecimento/BaseConhecimentoForm"
import { useBaseConhecimento } from "@/hooks/use-base-conhecimento"

interface BaseConhecimento {
  id: string
  titulo: string
  conteudo: string
  secao: string
  ordem: number
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

const SECAO_LABELS: Record<string, string> = {
  clinica: "Clínica",
  procedimentos: "Procedimentos",
  "pos-operatorio": "Pós-operatório",
  pagamento: "Pagamento",
  geral: "Geral",
}

function truncar(texto: string, max = 80): string {
  if (texto.length <= max) return texto
  return texto.slice(0, max).trim() + "…"
}

export default function BaseConhecimentoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<BaseConhecimento | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<BaseConhecimento | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<BaseConhecimento | null>(null)

  const autorizado = session?.user?.perfil === "gestor"

  const { dados, carregando, erro, recarregar } = useBaseConhecimento({
    busca: busca || undefined,
  })

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  if (status === "loading" || !autorizado) return null

  function handleEditar(registro: BaseConhecimento) {
    setEditando(registro)
    setFormAberto(true)
  }

  async function confirmarToggle() {
    if (!confirmToggle) return
    try {
      const res = await fetch(`/api/base-conhecimento/${confirmToggle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !confirmToggle.ativo }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao atualizar registro")
        return
      }

      toast.success(confirmToggle.ativo ? "Registro desativado" : "Registro ativado")
      recarregar()
    } catch {
      toast.error("Erro ao atualizar registro")
    } finally {
      setConfirmToggle(null)
    }
  }

  async function confirmarExcluir() {
    if (!confirmExcluir) return
    try {
      const res = await fetch(`/api/base-conhecimento/${confirmExcluir.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao remover registro")
        return
      }

      toast.success("Registro removido")
      recarregar()
    } catch {
      toast.error("Erro ao remover registro")
    } finally {
      setConfirmExcluir(null)
    }
  }

  const colunas: ColunaConfig<BaseConhecimento>[] = [
    {
      chave: "secao",
      titulo: "Seção",
      renderizar: (r) => (
        <Badge variant="secondary">{SECAO_LABELS[r.secao] ?? r.secao}</Badge>
      ),
    },
    { chave: "titulo", titulo: "Título", ordenavel: true },
    {
      chave: "conteudo",
      titulo: "Conteúdo",
      classesCelula: "hidden md:table-cell text-sm text-muted-foreground",
      renderizar: (r) => truncar(r.conteudo, 100),
    },
    {
      chave: "ordem",
      titulo: "Ordem",
      classesCelula: "hidden lg:table-cell text-sm",
    },
    {
      chave: "ativo",
      titulo: "Status",
      renderizar: (r) => (
        <Badge variant={r.ativo ? "default" : "destructive"}>
          {r.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      chave: "acoes" as keyof BaseConhecimento,
      titulo: "",
      renderizar: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditar(r)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmToggle(r)}>
              {r.ativo ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Desativar
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Ativar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmExcluir(r)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Base de Conhecimento" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Base de Conhecimento"
        descricao="Conteúdos que a Ana Júlia usa para responder os pacientes no WhatsApp"
      >
        <Button
          onClick={() => {
            setEditando(null)
            setFormAberto(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Conhecimento
        </Button>
      </PageHeader>

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={5} colunas={5} />
        ) : !carregando && dados.length === 0 && !busca ? (
          <EmptyState
            titulo="Nenhum conteúdo cadastrado"
            descricao="Cadastre informações que a Ana Júlia poderá usar nas conversas."
            textoBotao="Novo Conhecimento"
            onAcao={() => {
              setEditando(null)
              setFormAberto(true)
            }}
          />
        ) : (
          <DataTable
            colunas={colunas}
            dados={dados}
            total={dados.length}
            pagina={1}
            porPagina={dados.length || 10}
            onPaginaChange={() => {}}
            carregando={carregando}
            filtros={
              <Input
                placeholder="Buscar por título ou conteúdo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-[280px]"
              />
            }
          />
        )}
      </div>

      <BaseConhecimentoForm
        registro={editando}
        aberto={formAberto}
        onFechar={() => {
          setFormAberto(false)
          setEditando(null)
        }}
        onSucesso={() => {
          setFormAberto(false)
          setEditando(null)
          recarregar()
        }}
      />

      <ConfirmDialog
        titulo={confirmToggle?.ativo ? "Desativar conteúdo" : "Ativar conteúdo"}
        descricao={
          confirmToggle?.ativo
            ? `Desativar "${confirmToggle?.titulo}"? A Ana Júlia deixará de usar esse conteúdo.`
            : `Reativar "${confirmToggle?.titulo}"? A Ana Júlia voltará a usar esse conteúdo.`
        }
        aberto={!!confirmToggle}
        onFechar={() => setConfirmToggle(null)}
        onConfirmar={confirmarToggle}
        variante={confirmToggle?.ativo ? "destrutivo" : "padrao"}
        textoBotao={confirmToggle?.ativo ? "Desativar" : "Ativar"}
      />

      <ConfirmDialog
        titulo="Excluir conteúdo"
        descricao={`Excluir definitivamente "${confirmExcluir?.titulo}"? Esta ação não pode ser desfeita.`}
        aberto={!!confirmExcluir}
        onFechar={() => setConfirmExcluir(null)}
        onConfirmar={confirmarExcluir}
        variante="destrutivo"
        textoBotao="Excluir"
      />
    </div>
  )
}
