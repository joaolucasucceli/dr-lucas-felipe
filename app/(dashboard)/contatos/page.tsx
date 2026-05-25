"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, Download, X, Archive, ArchiveRestore, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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
  // JLU-171 (P1 25/05): aceita `?tipo=paciente` (atalho do sidebar "Pacientes").
  // Lucas chega pela sidebar e ja ve so pacientes — abre prontuario direto.
  const tipoInicial = (() => {
    const v = searchParams.get("tipo")
    return v === "lead" || v === "paciente" ? v : "todos"
  })()
  const [tipo, setTipo] = useState<"lead" | "paciente" | "todos">(tipoInicial)
  const [statusFunil, setStatusFunil] = useState("")
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const [formAberto, setFormAberto] = useState(false)
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
  const [filtroEspecial, setFiltroEspecial] = useState<"alerta" | "followup" | undefined>(
    () => {
      const v = searchParams.get("filtro")
      return v === "alerta" || v === "followup" ? v : undefined
    }
  )

  const { dados, total, carregando, erro, recarregar } = useContatos({
    pagina,
    porPagina: 10,
    tipo,
    statusFunil: statusFunil || undefined,
    busca: busca || undefined,
    arquivado: mostrarArquivados ? "true" : undefined,
    filtroEspecial,
  })

  const podecriar =
    session?.user?.perfil === "gestor" ||
    session?.user?.perfil === "atendente"
  const ehGestor = session?.user?.perfil === "gestor"

  async function executarBatch(acao: "excluir" | "arquivar" | "desarquivar", ids: string[]) {
    try {
      const res = await fetch("/api/contatos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, acao }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro na operação")
      toast.success(`${data.sucesso} de ${data.total} contato(s) ${acao === "excluir" ? "excluídos" : acao === "arquivar" ? "arquivados" : "desarquivados"}`)
      recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na operação")
    }
  }

  const acoesEmMassa: AcaoEmMassa[] = [
    {
      label: "Arquivar",
      icone: <Archive className="h-4 w-4" />,
      onClick: (ids) => executarBatch("arquivar", ids),
      confirmacao: {
        titulo: "Arquivar contatos?",
        descricao: (qtd) => `${qtd} contato(s) serão arquivados e sumirão do kanban. Podem ser desarquivados depois.`,
        textoBotao: "Arquivar",
      },
    },
    {
      label: "Desarquivar",
      icone: <ArchiveRestore className="h-4 w-4" />,
      onClick: (ids) => executarBatch("desarquivar", ids),
    },
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
    { chave: "nome", titulo: "Nome", ordenavel: true },
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

  // JLU-171 (P1): se entrou pelo atalho "Pacientes" do sidebar, ajusta titulo.
  const tituloPage = tipo === "paciente" ? "Pacientes" : "Contatos"
  const descricaoPage =
    tipo === "paciente"
      ? "Pacientes (lead promovidos). Clique pra abrir o prontuário."
      : "Leads e pacientes da clínica"

  return (
    <div>
      <PageHeader titulo={tituloPage} descricao={descricaoPage}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams({ tipo: "leads" })
            if (statusFunil) params.set("statusFunil", statusFunil)
            window.open(`/api/relatorios/exportar?${params.toString()}`, "_blank")
            toast.success("Exportação iniciada")
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
        {podecriar && (
          <Button onClick={() => setFormAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contato
          </Button>
        )}
      </PageHeader>

      {filtroEspecial && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm dark:border-yellow-800 dark:bg-yellow-950">
          <span className="font-medium text-yellow-800 dark:text-yellow-200">
            {filtroEspecial === "alerta"
              ? "Contatos em Alerta — sem movimentação há 3+ dias"
              : "Follow-ups Aguardando Resposta"}
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
            descricao="Crie o primeiro contato ou aguarde o agente IA."
            textoBotao={podecriar ? "Novo Contato" : undefined}
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
            selecionavel
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
                    <SelectItem value="acolhimento">Acolhimento</SelectItem>
                    <SelectItem value="qualificacao">Qualificação</SelectItem>
                    <SelectItem value="agendamento">Agendamento</SelectItem>
                    <SelectItem value="consulta_agendada">Reunião Agendada</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="arquivados"
                    checked={mostrarArquivados}
                    onCheckedChange={(v) => {
                      setMostrarArquivados(!!v)
                      setPagina(1)
                    }}
                  />
                  <Label htmlFor="arquivados" className="text-sm">
                    Arquivados
                  </Label>
                </div>
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
