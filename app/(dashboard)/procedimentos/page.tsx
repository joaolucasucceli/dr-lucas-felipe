"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Plus, MoreHorizontal, Pencil, UserX, UserCheck } from "lucide-react"
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
import { ProcedimentoForm } from "@/components/features/procedimentos/ProcedimentoForm"
import { useProcedimentos } from "@/hooks/use-procedimentos"

interface Procedimento {
  id: string
  nome: string
  tipo: string
  descricao: string | null
  valorBase: number | null
  duracaoMin: number
  posOperatorio: string | null
  ativo: boolean
  criadoEm: string
}

const tipoLabels: Record<string, string> = {
  cirurgico: "Cirúrgico",
  estetico: "Estético",
  "minimamente-invasivo": "Minimamente Invasivo",
}

function formatarValor(valor: number | null): string {
  if (valor === null || valor === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor))
}

export default function ProcedimentosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [formAberto, setFormAberto] = useState(false)
  const [procedimentoEditando, setProcedimentoEditando] =
    useState<Procedimento | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Procedimento | null>(null)

  const autorizado = session?.user?.perfil === "gestor"

  const { dados, carregando, erro, recarregar } = useProcedimentos({
    busca: busca || undefined,
  })

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  if (status === "loading" || !autorizado) return null

  const isGestor = autorizado

  function handleEditar(procedimento: Procedimento) {
    setProcedimentoEditando(procedimento)
    setFormAberto(true)
  }

  function handleToggleAtivo(procedimento: Procedimento) {
    setConfirmToggle(procedimento)
  }

  async function confirmarToggle() {
    if (!confirmToggle) return
    try {
      const res = await fetch(`/api/procedimentos/${confirmToggle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !confirmToggle.ativo }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao atualizar procedimento")
        return
      }

      toast.success(
        confirmToggle.ativo ? "Procedimento desativado" : "Procedimento ativado"
      )
      recarregar()
    } catch {
      toast.error("Erro ao atualizar procedimento")
    } finally {
      setConfirmToggle(null)
    }
  }

  const colunas: ColunaConfig<Procedimento>[] = [
    { chave: "nome", titulo: "Nome", ordenavel: true },
    {
      chave: "tipo",
      titulo: "Tipo",
      classesCelula: "hidden sm:table-cell",
      renderizar: (p) => (
        <Badge variant="secondary">{tipoLabels[p.tipo] || p.tipo}</Badge>
      ),
    },
    {
      chave: "valorBase",
      titulo: "Valor Base",
      classesCelula: "hidden md:table-cell",
      renderizar: (p) => formatarValor(p.valorBase),
    },
    {
      chave: "duracaoMin",
      titulo: "Duração",
      classesCelula: "hidden md:table-cell",
      renderizar: (p) => `${p.duracaoMin}min`,
    },
    {
      chave: "ativo",
      titulo: "Status",
      renderizar: (p) => (
        <Badge variant={p.ativo ? "default" : "destructive"}>
          {p.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    ...(isGestor
      ? [
          {
            chave: "acoes" as keyof Procedimento,
            titulo: "",
            renderizar: (p: Procedimento) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditar(p)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleAtivo(p)}>
                    {p.ativo ? (
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
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColunaConfig<Procedimento>,
        ]
      : []),
  ]

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Procedimentos" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Procedimentos"
        descricao="Gerencie os procedimentos da clínica"
      >
        {isGestor && (
          <Button
            onClick={() => {
              setProcedimentoEditando(null)
              setFormAberto(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Procedimento
          </Button>
        )}
      </PageHeader>

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={5} colunas={4} />
        ) : !carregando && dados.length === 0 && !busca ? (
          <EmptyState
            titulo="Nenhum procedimento"
            descricao="Cadastre o primeiro procedimento da clínica."
            textoBotao={isGestor ? "Novo Procedimento" : undefined}
            onAcao={
              isGestor
                ? () => {
                    setProcedimentoEditando(null)
                    setFormAberto(true)
                  }
                : undefined
            }
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
                placeholder="Buscar procedimento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-[250px]"
              />
            }
          />
        )}
      </div>

      <ProcedimentoForm
        procedimento={procedimentoEditando}
        aberto={formAberto}
        onFechar={() => {
          setFormAberto(false)
          setProcedimentoEditando(null)
        }}
        onSucesso={() => {
          setFormAberto(false)
          setProcedimentoEditando(null)
          recarregar()
        }}
      />

      <ConfirmDialog
        titulo={confirmToggle?.ativo ? "Desativar procedimento" : "Ativar procedimento"}
        descricao={
          confirmToggle?.ativo
            ? `Desativar "${confirmToggle?.nome}"? Ele não aparecerá mais para novos agendamentos.`
            : `Reativar "${confirmToggle?.nome}"?`
        }
        aberto={!!confirmToggle}
        onFechar={() => setConfirmToggle(null)}
        onConfirmar={confirmarToggle}
        variante={confirmToggle?.ativo ? "destrutivo" : "padrao"}
        textoBotao={confirmToggle?.ativo ? "Desativar" : "Ativar"}
      />
    </div>
  )
}
