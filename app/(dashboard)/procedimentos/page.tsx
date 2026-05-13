"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Plus, MoreHorizontal, Pencil, Tags, Trash2 } from "lucide-react"
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
import { DataTable, type ColunaConfig, type AcaoEmMassa } from "@/components/features/shared/DataTable"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { ProcedimentoForm } from "@/components/features/procedimentos/ProcedimentoForm"
import { TiposProcedimentoDialog } from "@/components/features/procedimentos/TiposProcedimentoDialog"
import { useProcedimentos } from "@/hooks/use-procedimentos"

interface Procedimento {
  id: string
  nome: string
  tipo: string
  descricao: string | null
  duracaoMin: number
  posOperatorio: string | null
  ativo: boolean
  criadoEm: string
  valorEstimadoBrl: number | null
  valorCheioBrl: number | null
  parcelamento: string | null
  escopoOferta: string | null
}

function formatarBRL(valor: number | null): string {
  if (valor == null) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor)
}

const tipoLabels: Record<string, string> = {
  cirurgico: "Cirúrgico",
  estetico: "Estético",
  "minimamente-invasivo": "Minimamente Invasivo",
}

export default function ProcedimentosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [formAberto, setFormAberto] = useState(false)
  const [procedimentoEditando, setProcedimentoEditando] =
    useState<Procedimento | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<Procedimento | null>(null)
  const [tiposAberto, setTiposAberto] = useState(false)

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

  async function executarBatchExcluir(ids: string[]) {
    try {
      const res = await fetch("/api/procedimentos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, acao: "excluir" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro na operação")
      toast.success(`${data.sucesso} de ${data.total} procedimento(s) excluído(s)`)
      recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na operação")
    }
  }

  const acoesEmMassa: AcaoEmMassa[] = [
    {
      label: "Excluir",
      icone: <Trash2 className="h-4 w-4" />,
      variante: "destrutivo",
      onClick: executarBatchExcluir,
      confirmacao: {
        titulo: "Excluir procedimentos?",
        descricao: (qtd) =>
          `${qtd} procedimento(s) serão removidos. Agendamentos antigos que apontavam pra eles continuam preservados, mas o procedimento não aparece mais em nenhuma busca.`,
        textoBotao: "Excluir",
      },
    },
  ]

  function handleEditar(procedimento: Procedimento) {
    setProcedimentoEditando(procedimento)
    setFormAberto(true)
  }

  async function confirmarExcluir() {
    if (!confirmExcluir) return
    try {
      const res = await fetch(`/api/procedimentos/${confirmExcluir.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao excluir procedimento")
        return
      }

      toast.success("Procedimento excluído")
      recarregar()
    } catch {
      toast.error("Erro ao excluir procedimento")
    } finally {
      setConfirmExcluir(null)
    }
  }

  const colunas: ColunaConfig<Procedimento>[] = [
    {
      chave: "nome",
      titulo: "Nome",
      ordenavel: true,
      renderizar: (p) => (
        <button
          onClick={() => handleEditar(p)}
          className="text-left font-medium hover:underline"
        >
          {p.nome}
        </button>
      ),
    },
    {
      chave: "tipo",
      titulo: "Tipo",
      classesCelula: "hidden sm:table-cell",
      renderizar: (p) => (
        <Badge variant="secondary">{tipoLabels[p.tipo] || p.tipo}</Badge>
      ),
    },
    {
      chave: "duracaoMin",
      titulo: "Duração da cirurgia",
      classesCelula: "hidden md:table-cell",
      renderizar: (p) => `${p.duracaoMin}min`,
    },
    {
      chave: "valorEstimadoBrl",
      titulo: "Valor estimado",
      classesCelula: "hidden lg:table-cell",
      renderizar: (p) => (
        <div className="text-sm">
          <div className="font-medium">{formatarBRL(p.valorEstimadoBrl)}</div>
          {p.valorCheioBrl != null && (
            <div className="text-muted-foreground line-through text-xs">
              {formatarBRL(p.valorCheioBrl)}
            </div>
          )}
        </div>
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
                  <DropdownMenuItem
                    onClick={() => setConfirmExcluir(p)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setTiposAberto(true)}
            >
              <Tags className="mr-2 h-4 w-4" />
              Gerenciar Tipos
            </Button>
            <Button
              onClick={() => {
                setProcedimentoEditando(null)
                setFormAberto(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Procedimento
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={5} colunas={3} />
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
            selecionavel
            acoesEmMassa={acoesEmMassa}
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

      <TiposProcedimentoDialog
        aberto={tiposAberto}
        onFechar={() => setTiposAberto(false)}
      />

      <ConfirmDialog
        titulo="Excluir procedimento"
        descricao={
          confirmExcluir
            ? `Excluir "${confirmExcluir.nome}"? Agendamentos antigos que apontavam pra ele continuam preservados, mas o procedimento não aparece mais em nenhuma busca.`
            : ""
        }
        aberto={!!confirmExcluir}
        onFechar={() => setConfirmExcluir(null)}
        onConfirmar={confirmarExcluir}
        variante="destrutivo"
        textoBotao="Excluir"
      />
    </div>
  )
}
