"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { DataTable, type ColunaConfig } from "@/components/features/shared/DataTable"

interface AuditLog {
  id: string
  acao: string
  entidade: string
  entidadeId: string | null
  ip: string | null
  criadoEm: string
  usuario: { nome: string; email: string } | null
}

interface Resposta {
  dados: AuditLog[]
  total: number
  pagina: number
  totalPaginas: number
}

const ENTIDADES = ["Lead", "Sprint", "SprintItem", "Procedimento", "Agendamento", "Usuario", "ConfigWhatsapp"]
const ACOES = ["create", "update", "delete", "anonimizar", "arquivar"]

export default function AuditoriaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [dados, setDados] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [carregando, setCarregando] = useState(true)

  const [filtroEntidade, setFiltroEntidade] = useState("")
  const [filtroAcao, setFiltroAcao] = useState("")
  const [filtroDataInicio, setFiltroDataInicio] = useState("")
  const [filtroDataFim, setFiltroDataFim] = useState("")

  const perfil = session?.user?.perfil
  const autorizado = perfil === "gestor" || perfil === "desenvolvedor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  const buscar = useCallback(async (p: number) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ pagina: String(p), porPagina: "20" })
      if (filtroEntidade && filtroEntidade !== "todas") params.set("entidade", filtroEntidade)
      if (filtroAcao && filtroAcao !== "todas") params.set("acao", filtroAcao)
      if (filtroDataInicio) params.set("dataInicio", new Date(filtroDataInicio).toISOString())
      if (filtroDataFim) {
        const fim = new Date(filtroDataFim)
        fim.setHours(23, 59, 59, 999)
        params.set("dataFim", fim.toISOString())
      }
      const res = await fetch(`/api/auditoria?${params}`)
      if (!res.ok) throw new Error()
      const json: Resposta = await res.json()
      setDados(json.dados)
      setTotal(json.total)
    } catch {
      setDados([])
      setTotal(0)
    } finally {
      setCarregando(false)
    }
  }, [filtroEntidade, filtroAcao, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    if (autorizado) {
      setPagina(1)
      buscar(1)
    }
  }, [autorizado, filtroEntidade, filtroAcao, filtroDataInicio, filtroDataFim, buscar])

  function handlePagina(p: number) {
    setPagina(p)
    buscar(p)
  }

  function exportarCSV() {
    const cabecalho = ["Data/Hora", "Usuário", "Email", "Ação", "Entidade", "Entidade ID", "IP"]
    const linhas = dados.map((r) => [
      new Date(r.criadoEm).toLocaleString("pt-BR"),
      r.usuario?.nome || "-",
      r.usuario?.email || "-",
      r.acao,
      r.entidade,
      r.entidadeId || "-",
      r.ip || "-",
    ])
    const csv = [cabecalho, ...linhas].map((l) => l.map((c) => `"${c}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const colunas: ColunaConfig<AuditLog>[] = [
    {
      chave: "criadoEm",
      titulo: "Data/Hora",
      renderizar: (r) => new Date(r.criadoEm).toLocaleString("pt-BR"),
    },
    {
      chave: "usuario",
      titulo: "Usuário",
      renderizar: (r) => r.usuario?.nome || <span className="text-muted-foreground">Sistema</span>,
    },
    { chave: "acao", titulo: "Ação" },
    { chave: "entidade", titulo: "Entidade" },
    {
      chave: "entidadeId",
      titulo: "Entidade ID",
      renderizar: (r) => (
        <span className="text-xs text-muted-foreground font-mono">{r.entidadeId || "—"}</span>
      ),
    },
    {
      chave: "ip",
      titulo: "IP",
      renderizar: (r) => r.ip || "—",
    },
  ]

  const filtros = (
    <>
      <Select value={filtroEntidade || "todas"} onValueChange={(v) => setFiltroEntidade(v === "todas" ? "" : v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Entidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas entidades</SelectItem>
          {ENTIDADES.map((e) => (
            <SelectItem key={e} value={e}>{e}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtroAcao || "todas"} onValueChange={(v) => setFiltroAcao(v === "todas" ? "" : v)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Ação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas ações</SelectItem>
          {ACOES.map((a) => (
            <SelectItem key={a} value={a}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-40"
        value={filtroDataInicio}
        onChange={(e) => setFiltroDataInicio(e.target.value)}
        placeholder="De"
      />
      <Input
        type="date"
        className="w-40"
        value={filtroDataFim}
        onChange={(e) => setFiltroDataFim(e.target.value)}
        placeholder="Até"
      />
    </>
  )

  if (status === "loading" || !autorizado) return null

  return (
    <div>
      <PageHeader
        titulo="Auditoria"
        descricao="Log de todas as ações realizadas no sistema"
      >
        <Button variant="outline" onClick={exportarCSV} disabled={dados.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </PageHeader>

      <div className="mt-6">
        <DataTable
          colunas={colunas}
          dados={dados}
          total={total}
          pagina={pagina}
          porPagina={20}
          onPaginaChange={handlePagina}
          carregando={carregando}
          filtros={filtros}
        />
      </div>
    </div>
  )
}
