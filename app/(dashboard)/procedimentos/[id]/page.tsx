"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { useAutosave, IndicadorSalvamento } from "@/hooks/use-autosave"

interface Procedimento {
  id: string
  nome: string
  tipo: string
  descricao: string | null
  valorBase: number | null
  duracaoMin: number
  posOperatorio: string | null
  ativo: boolean
}

export default function ProcedimentoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string

  const [procedimento, setProcedimento] = useState<Procedimento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const [nome, setNome] = useState("")
  const [tipo, setTipo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [valorBase, setValorBase] = useState("")
  const [duracaoMin, setDuracaoMin] = useState("")
  const [posOperatorio, setPosOperatorio] = useState("")
  const [ativo, setAtivo] = useState(true)

  const isGestor =
    session?.user?.perfil === "gestor"

  const buscar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/procedimentos/${id}`)
      if (!res.ok) throw new Error("Erro ao carregar procedimento")
      const data = await res.json()
      setProcedimento(data)
      setNome(data.nome)
      setTipo(data.tipo)
      setDescricao(data.descricao || "")
      setValorBase(data.valorBase?.toString() || "")
      setDuracaoMin(data.duracaoMin.toString())
      setPosOperatorio(data.posOperatorio || "")
      setAtivo(data.ativo)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    buscar()
  }, [buscar])

  const salvarCampos = useCallback(
    async (dados: Record<string, unknown>) => {
      const res = await fetch(`/api/procedimentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
    },
    [id]
  )

  const salvarTexto = useCallback(
    async (v: { nome: string; descricao: string; posOperatorio: string }) => {
      await salvarCampos(v)
    },
    [salvarCampos]
  )

  const salvarNumeros = useCallback(
    async (v: { valorBase: string; duracaoMin: string }) => {
      const body: Record<string, unknown> = {}
      if (v.valorBase) body.valorBase = parseFloat(v.valorBase)
      if (v.duracaoMin) body.duracaoMin = parseInt(v.duracaoMin, 10)
      await salvarCampos(body)
    },
    [salvarCampos]
  )

  const { status: statusTexto } = useAutosave({
    valor: { nome, descricao, posOperatorio },
    valorInicial: {
      nome: procedimento?.nome || "",
      descricao: procedimento?.descricao || "",
      posOperatorio: procedimento?.posOperatorio || "",
    },
    onSalvar: salvarTexto,
  })

  const { status: statusNumeros } = useAutosave({
    valor: { valorBase, duracaoMin },
    valorInicial: {
      valorBase: procedimento?.valorBase?.toString() || "",
      duracaoMin: procedimento?.duracaoMin?.toString() || "",
    },
    onSalvar: salvarNumeros,
  })

  async function handleTipoChange(novoTipo: string) {
    setTipo(novoTipo)
    try {
      await salvarCampos({ tipo: novoTipo })
      toast.success("Tipo atualizado")
    } catch {
      toast.error("Erro ao salvar tipo")
    }
  }

  async function handleAtivoChange(novoAtivo: boolean) {
    setAtivo(novoAtivo)
    try {
      await salvarCampos({ ativo: novoAtivo })
      toast.success(novoAtivo ? "Procedimento ativado" : "Procedimento desativado")
    } catch {
      toast.error("Erro ao salvar status")
    }
  }

  async function handleExcluir() {
    try {
      const res = await fetch(`/api/procedimentos/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao excluir")
      toast.success("Procedimento excluído")
      router.push("/procedimentos")
    } catch {
      toast.error("Erro ao excluir procedimento")
    }
  }

  if (carregando) {
    return (
      <div>
        <PageHeader titulo="Carregando..." />
        <div className="mt-6">
          <LoadingState />
        </div>
      </div>
    )
  }

  if (erro || !procedimento) {
    return (
      <div>
        <PageHeader titulo="Procedimento" />
        <div className="mt-6">
          <ErrorState mensagem={erro || "Procedimento não encontrado"} onTentar={buscar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo={nome || procedimento.nome} descricao="Detalhes do procedimento">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/procedimentos")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          {isGestor && (
            <Button variant="destructive" onClick={() => setConfirmExcluir(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Informações</CardTitle>
            <IndicadorSalvamento status={statusTexto} />
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={!isGestor} />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={handleTipoChange} disabled={!isGestor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cirurgico">Cirúrgico</SelectItem>
                  <SelectItem value="estetico">Estético</SelectItem>
                  <SelectItem value="minimamente-invasivo">Minimamente Invasivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={!isGestor}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Valores e Duração</CardTitle>
            <IndicadorSalvamento status={statusNumeros} />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Valor Base (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorBase}
                onChange={(e) => setValorBase(e.target.value)}
                disabled={!isGestor}
              />
            </div>
            <div className="grid gap-2">
              <Label>Duração (min)</Label>
              <Input
                type="number"
                min="1"
                value={duracaoMin}
                onChange={(e) => setDuracaoMin(e.target.value)}
                disabled={!isGestor}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pós-operatório</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={posOperatorio}
              onChange={(e) => setPosOperatorio(e.target.value)}
              disabled={!isGestor}
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Switch checked={ativo} onCheckedChange={handleAtivoChange} disabled={!isGestor} />
            <span className="text-sm">{ativo ? "Ativo" : "Inativo"}</span>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        titulo="Excluir procedimento"
        descricao={`Tem certeza que deseja excluir "${procedimento.nome}"? Esta ação não pode ser desfeita.`}
        aberto={confirmExcluir}
        onFechar={() => setConfirmExcluir(false)}
        onConfirmar={handleExcluir}
        variante="destrutivo"
        textoBotao="Excluir"
      />
    </div>
  )
}
