"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, Download, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { DataTable, type ColunaConfig } from "@/components/features/shared/DataTable"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { UserAvatar } from "@/components/features/shared/UserAvatar"
import { LeadForm } from "@/components/features/leads/LeadForm"
import { useLeads } from "@/hooks/use-leads"

interface Lead {
  id: string
  nome: string
  whatsapp: string
  email: string | null
  procedimentoInteresse: string | null
  statusFunil: string
  origem: string | null
  arquivado: boolean
  criadoEm: string
  responsavel: { id: string; nome: string } | null
}

interface Procedimento {
  id: string
  nome: string
}

export default function LeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState("")
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

  const { dados, total, carregando, erro, recarregar } = useLeads({
    pagina,
    porPagina: 10,
    statusFunil: statusFunil || undefined,
    busca: busca || undefined,
    arquivado: mostrarArquivados ? "true" : undefined,
    filtroEspecial,
  })

  const podecriar =
    session?.user?.perfil === "gestor" ||
    session?.user?.perfil === "atendente"

  useEffect(() => {
    fetch("/api/procedimentos?ativo=true")
      .then((res) => res.json())
      .then((json) => setProcedimentos(json.dados || []))
      .catch(() => {})
  }, [])

  const colunas: ColunaConfig<Lead>[] = [
    { chave: "nome", titulo: "Nome", ordenavel: true },
    {
      chave: "whatsapp",
      titulo: "WhatsApp",
      classesCelula: "hidden sm:table-cell",
    },
    {
      chave: "procedimentoInteresse",
      titulo: "Procedimento",
      classesCelula: "hidden md:table-cell",
      renderizar: (l) => l.procedimentoInteresse || "—",
    },
    {
      chave: "statusFunil",
      titulo: "Etapa",
      renderizar: (l) => <StatusBadge status={l.statusFunil} />,
    },
    {
      chave: "responsavel" as keyof Lead,
      titulo: "Responsável",
      classesCelula: "hidden lg:table-cell",
      renderizar: (l) =>
        l.responsavel ? (
          <div className="flex items-center gap-2">
            <UserAvatar nome={l.responsavel.nome} tamanho="sm" />
            <span className="text-sm">{l.responsavel.nome}</span>
          </div>
        ) : (
          "—"
        ),
    },
    {
      chave: "criadoEm",
      titulo: "Criado em",
      classesCelula: "hidden lg:table-cell",
      renderizar: (l) => new Date(l.criadoEm).toLocaleDateString("pt-BR"),
    },
  ]

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Leads" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Leads" descricao="Gerencie os leads e pacientes da clínica">
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
            Novo Lead
          </Button>
        )}
      </PageHeader>

      {filtroEspecial && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm dark:border-yellow-800 dark:bg-yellow-950">
          <span className="font-medium text-yellow-800 dark:text-yellow-200">
            {filtroEspecial === "alerta"
              ? "Leads em Alerta — sem movimentação há 3+ dias"
              : "Follow-ups Aguardando Resposta"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-yellow-700 hover:text-yellow-900 dark:text-yellow-300"
            onClick={() => {
              setFiltroEspecial(undefined)
              router.replace("/leads")
            }}
          >
            <X className="mr-1 h-3 w-3" />
            Limpar
          </Button>
        </div>
      )}

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={6} colunas={5} />
        ) : !carregando && dados.length === 0 && !busca && !statusFunil ? (
          <EmptyState
            titulo="Nenhum lead"
            descricao="Crie o primeiro lead ou aguarde o agente IA."
            textoBotao={podecriar ? "Novo Lead" : undefined}
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
            onLinhaClick={(lead) => router.push(`/leads/${lead.id}`)}
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
                    <SelectItem value="consulta_agendada">Consulta Agendada</SelectItem>
                    <SelectItem value="consulta_realizada">Consulta Realizada</SelectItem>
                    <SelectItem value="sinal_pago">Sinal Pago</SelectItem>
                    <SelectItem value="procedimento_agendado">Procedimento Agendado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
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

      <LeadForm
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
