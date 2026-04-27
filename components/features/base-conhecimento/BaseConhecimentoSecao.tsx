"use client"

import { forwardRef, useImperativeHandle, useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type ColunaConfig, type AcaoEmMassa } from "@/components/features/shared/DataTable"
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
  criadoEm: string
  atualizadoEm: string
}

function truncar(texto: string, max = 80): string {
  if (texto.length <= max) return texto
  return texto.slice(0, max).trim() + "…"
}

export interface BaseConhecimentoSecaoHandle {
  abrirNovo: () => void
}

export const BaseConhecimentoSecao = forwardRef<BaseConhecimentoSecaoHandle>(
  function BaseConhecimentoSecao(_, ref) {
  const [busca, setBusca] = useState("")
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<BaseConhecimento | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<BaseConhecimento | null>(null)

  useImperativeHandle(ref, () => ({
    abrirNovo: () => {
      setEditando(null)
      setFormAberto(true)
    },
  }))

  const { dados, carregando, erro, recarregar } = useBaseConhecimento({
    busca: busca || undefined,
  })

  async function executarBatchExcluir(ids: string[]) {
    try {
      const res = await fetch("/api/base-conhecimento/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, acao: "excluir" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao excluir")
      toast.success(`${data.sucesso} de ${data.total} registro(s) excluído(s)`)
      recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir")
    }
  }

  const acoesEmMassa: AcaoEmMassa[] = [
    {
      label: "Excluir",
      icone: <Trash2 className="h-4 w-4" />,
      variante: "destrutivo",
      onClick: (ids) => executarBatchExcluir(ids),
      confirmacao: {
        titulo: "Excluir registros?",
        descricao: (qtd) =>
          `${qtd} registro(s) serão removidos permanentemente. A Ana Júlia deixa de usá-los.`,
        textoBotao: "Excluir",
      },
    },
  ]

  function handleEditar(registro: BaseConhecimento) {
    setEditando(registro)
    setFormAberto(true)
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
    { chave: "titulo", titulo: "Título", ordenavel: true },
    {
      chave: "conteudo",
      titulo: "Conteúdo",
      classesCelula: "text-sm text-muted-foreground",
      renderizar: (r) => truncar(r.conteudo, 120),
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
            <DropdownMenuItem
              onClick={() => setConfirmExcluir(r)}
              className="text-destructive focus:text-destructive"
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
    return <ErrorState mensagem={erro} onTentar={recarregar} />
  }

  return (
    <div>
      {carregando && dados.length === 0 ? (
        <SkeletonTabela linhas={5} colunas={3} />
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
          selecionavel
          acoesEmMassa={acoesEmMassa}
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
})
