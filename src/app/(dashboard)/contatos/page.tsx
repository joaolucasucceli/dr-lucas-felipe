"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, X, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { DataTable, type ColunaConfig, type AcaoEmMassa } from "@/components/features/shared/DataTable"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { UserAvatar } from "@/components/features/shared/UserAvatar"
import { ContatoForm } from "@/components/features/contatos/ContatoForm"
import { useContatos, type Contato } from "@/hooks/use-contatos"
import { ETAPAS_FUNIL, FUNIL_LABELS } from "@/lib/funil"

interface Procedimento {
  id: string
  nome: string
}

export default function ContatosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState("")
  const tipoInicial = (() => {
    const v = searchParams.get("tipo")
    return v === "lead" || v === "paciente" ? v : "todos"
  })()
  const [tipo, setTipo] = useState<"lead" | "paciente" | "todos">(tipoInicial)
  const [statusFunil, setStatusFunil] = useState("")
  const [formAberto, setFormAberto] = useState(false)
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
  const [filtroEspecial, setFiltroEspecial] = useState<"followup" | undefined>(
    () => {
      const v = searchParams.get("filtro")
      return v === "followup" ? v : undefined
    }
  )

  const { dados, total, carregando, erro, recarregar } = useContatos({
    pagina,
    porPagina: 10,
    tipo,
    statusFunil: statusFunil || undefined,
    busca: busca || undefined,
    filtroEspecial,
  })

  const podecriar =
    session?.user?.perfil === "gestor" ||
    session?.user?.perfil === "atendente"
  const ehGestor = session?.user?.perfil === "gestor"

  async function executarBatch(acao: "excluir", ids: string[]) {
    try {
      const res = await fetch("/api/contatos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, acao }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro na operação")
      toast.success(`${data.sucesso} de ${data.total} contato(s) excluídos`)
      recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na operação")
    }
  }

  const acoesEmMassa: AcaoEmMassa[] = [
    ...(ehGestor
      ? [
          {
            label: "Excluir",
            icone: <Trash2 className="h-4 w-4" />,
            variante: "destrutivo" as const,
            onClick: (ids: string[]) => executarBatch("excluir", ids),
            confirmacao: {
              titulo: "Excluir contatos?",
              descricao: (qtd: number) => `${qtd} contato(s) serão removidos permanentemente (soft-delete). Esta ação não pode ser desfeita.`,
              textoBotao: "Excluir",
            },
          },
        ]
      : []),
  ]

  useEffect(() => {
    fetch("/api/procedimentos?ativo=true")
      .then((res) => res.json())
      .then((json) => setProcedimentos(json.dados || []))
      .catch(() => {})
  }, [])

  const colunas: ColunaConfig<Contato>[] = [
    {
      chave: "nome",
      titulo: "Nome",
      ordenavel: true,
      // JLU-171 (H 25/05): bandeira "sem prontuario" se paciente sem prontuario aberto
      renderizar: (c) => (
        <div className="flex items-center gap-2">
          <span>{c.nome}</span>
          {c.tipo === "paciente" && !c.prontuario && (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 text-[10px]">
              sem prontuário
            </Badge>
          )}
        </div>
      ),
    },
    {
      chave: "tipo",
      titulo: "Tipo",
      renderizar: (c) => (
        <Badge variant={c.tipo === "paciente" ? "default" : "secondary"} className="text-xs capitalize">
          {c.tipo}
        </Badge>
      ),
    },
    {
      chave: "whatsapp",
      titulo: "WhatsApp",
      classesCelula: "hidden sm:table-cell",
      renderizar: (c) => c.whatsapp || "—",
    },
    {
      chave: "procedimentoInteresse",
      titulo: "Procedimento",
      classesCelula: "hidden md:table-cell",
      renderizar: (c) => c.procedimentoInteresse || "—",
    },
    {
      chave: "statusFunil",
      titulo: "Etapa",
      renderizar: (c) =>
        c.tipo === "lead" && c.statusFunil ? <StatusBadge status={c.statusFunil} /> : <span className="text-muted-foreground">—</span>,
    },
    {
      chave: "responsavel" as keyof Contato,
      titulo: "Responsável",
      classesCelula: "hidden lg:table-cell",
      renderizar: (c) =>
        c.responsavel ? (
          <div className="flex items-center gap-2">
            <UserAvatar nome={c.responsavel.nome} tamanho="sm" />
            <span className="text-sm">{c.responsavel.nome}</span>
          </div>
        ) : (
          "—"
        ),
    },
    {
      chave: "criadoEm",
      titulo: "Criado em",
      classesCelula: "hidden lg:table-cell",
      renderizar: (c) => new Date(c.criadoEm).toLocaleDateString("pt-BR"),
    },
  ]

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Contatos" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Contatos" descricao="Leads e pacientes da clínica">
        {podecriar && (
          <Button onClick={() => setFormAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        )}
      </PageHeader>

      {filtroEspecial && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm dark:border-yellow-800 dark:bg-yellow-950">
          <span className="font-medium text-yellow-800 dark:text-yellow-200">
            Follow-ups Aguardando Resposta
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-yellow-700 hover:text-yellow-900 dark:text-yellow-300"
            onClick={() => {
              setFiltroEspecial(undefined)
              router.replace("/contatos")
            }}
          >
            <X className="mr-1 h-3 w-3" />
            Limpar
          </Button>
        </div>
      )}

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={6} colunas={6} />
        ) : !carregando && dados.length === 0 && !busca && !statusFunil && tipo === "todos" ? (
          <EmptyState
            titulo="Nenhum contato"
            descricao="Crie o primeiro paciente ou aguarde o agente IA."
            textoBotao={podecriar ? "Novo Paciente" : undefined}
            onAcao={podecriar ? () => setFormAberto(true) : undefined}
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
            onLinhaClick={(contato) => router.push(`/contatos/${contato.id}`)}
            selecionavel={ehGestor}
            acoesEmMassa={acoesEmMassa}
            filtros={
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  placeholder="Buscar por nome ou whatsapp..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value)
                    setPagina(1)
                  }}
                  className="w-[250px]"
                />
                <Select
                  value={tipo}
                  onValueChange={(v) => {
                    setTipo(v as "lead" | "paciente" | "todos")
                    setPagina(1)
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="lead">Leads</SelectItem>
                    <SelectItem value="paciente">Pacientes</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFunil}
                  onValueChange={(v) => {
                    setStatusFunil(v === "todos" ? "" : v)
                    setPagina(1)
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todas as etapas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as etapas</SelectItem>
                    {ETAPAS_FUNIL.map((etapa) => (
                      <SelectItem key={etapa} value={etapa}>
                        {FUNIL_LABELS[etapa]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          />
        )}
      </div>

      <ContatoForm
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        onSucesso={() => {
          setFormAberto(false)
          recarregar()
        }}
        procedimentos={procedimentos}
      />
    </div>
  )
}
