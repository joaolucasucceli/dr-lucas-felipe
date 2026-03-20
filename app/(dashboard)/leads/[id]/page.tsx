"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Trash2, Archive, ArchiveRestore, Upload, X, ImageIcon, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/features/shared/PageHeader"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { useAutosave, IndicadorSalvamento } from "@/hooks/use-autosave"
import { useLead } from "@/hooks/use-lead"
import { useAgendamentos } from "@/hooks/use-agendamentos"
import { AgendamentoForm } from "@/components/features/agendamentos/AgendamentoForm"

export default function LeadDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string

  const { lead, carregando, erro, recarregar } = useLead(id)

  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [confirmFoto, setConfirmFoto] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [confirmAnonimizar, setConfirmAnonimizar] = useState(false)
  const [formAgendamento, setFormAgendamento] = useState(false)
  const [confirmCancelarAgendamento, setConfirmCancelarAgendamento] = useState<string | null>(null)

  const { dados: agendamentos, recarregar: recarregarAgendamentos } = useAgendamentos({ leadId: id })

  const [nome, setNome] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [procedimentoInteresse, setProcedimentoInteresse] = useState("")
  const [origem, setOrigem] = useState("")
  const [statusFunil, setStatusFunil] = useState("")

  const [procedimentos, setProcedimentos] = useState<Array<{ id: string; nome: string }>>([])

  const isGestor =
    session?.user?.perfil === "gestor" ||
    session?.user?.perfil === "desenvolvedor"

  const initialized = useRef(false)

  useEffect(() => {
    if (lead && !initialized.current) {
      setNome(lead.nome)
      setWhatsapp(lead.whatsapp)
      setEmail(lead.email || "")
      setProcedimentoInteresse(lead.procedimentoInteresse || "")
      setOrigem(lead.origem || "")
      setStatusFunil(lead.statusFunil)
      initialized.current = true
    }
  }, [lead])

  useEffect(() => {
    fetch("/api/procedimentos?ativo=true")
      .then((res) => res.json())
      .then((json) => setProcedimentos(json.dados || []))
      .catch(() => {})
  }, [])

  const salvarDados = useCallback(
    async (v: { nome: string; whatsapp: string; email: string }) => {
      const body: Record<string, string> = { nome: v.nome, whatsapp: v.whatsapp }
      if (v.email) body.email = v.email
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
    },
    [id]
  )

  const { status: statusDados } = useAutosave({
    valor: { nome, whatsapp, email },
    valorInicial: {
      nome: lead?.nome || "",
      whatsapp: lead?.whatsapp || "",
      email: lead?.email || "",
    },
    onSalvar: salvarDados,
  })

  async function handleStatusChange(novoStatus: string) {
    setStatusFunil(novoStatus)
    try {
      const res = await fetch(`/api/leads/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusFunil: novoStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success("Etapa atualizada")
    } catch {
      toast.error("Erro ao atualizar etapa")
    }
  }

  async function handleProcedimentoChange(valor: string) {
    const proc = valor === "nenhum" ? "" : valor
    setProcedimentoInteresse(proc)
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedimentoInteresse: proc || null }),
      })
      if (!res.ok) throw new Error()
      toast.success("Procedimento atualizado")
    } catch {
      toast.error("Erro ao salvar")
    }
  }

  async function handleOrigemChange(valor: string) {
    setOrigem(valor)
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origem: valor || null }),
      })
    } catch {}
  }

  async function handleArquivar() {
    try {
      const res = await fetch(`/api/leads/${id}/arquivar`, { method: "PATCH" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(data.arquivado ? "Lead arquivado" : "Lead desarquivado")
      recarregar()
    } catch {
      toast.error("Erro ao arquivar/desarquivar")
    }
  }

  async function handleExcluir() {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Lead excluído")
      router.push("/leads")
    } catch {
      toast.error("Erro ao excluir lead")
    }
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFoto(true)
    const formData = new FormData()
    formData.append("arquivo", file)

    try {
      const res = await fetch(`/api/leads/${id}/fotos`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Erro ao enviar foto")
        return
      }
      toast.success("Foto enviada")
      recarregar()
    } catch {
      toast.error("Erro ao enviar foto")
    } finally {
      setUploadingFoto(false)
      e.target.value = ""
    }
  }

  function handleExportarDados() {
    const a = document.createElement("a")
    a.href = `/api/lgpd/exportar/${id}`
    a.download = `lead-${id}-dados.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function handleAnonimizar() {
    try {
      const res = await fetch(`/api/lgpd/anonimizar/${id}`, { method: "POST" })
      if (!res.ok) throw new Error()
      toast.success("Dados anonimizados com sucesso")
      router.push("/leads")
    } catch {
      toast.error("Erro ao anonimizar dados")
    }
  }

  async function handleExcluirFoto(fotoId: string) {
    try {
      const res = await fetch(`/api/leads/${id}/fotos/${fotoId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("Foto removida")
      setConfirmFoto(null)
      recarregar()
    } catch {
      toast.error("Erro ao remover foto")
    }
  }

  async function handleCancelarAgendamento() {
    if (!confirmCancelarAgendamento) return
    try {
      const res = await fetch(`/api/agendamentos/${confirmCancelarAgendamento}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Agendamento cancelado")
      recarregarAgendamentos()
    } catch {
      toast.error("Erro ao cancelar agendamento")
    } finally {
      setConfirmCancelarAgendamento(null)
    }
  }

  if (carregando) {
    return (
      <div>
        <PageHeader titulo="Carregando..." />
        <div className="mt-6"><LoadingState /></div>
      </div>
    )
  }

  if (erro || !lead) {
    return (
      <div>
        <PageHeader titulo="Lead" />
        <div className="mt-6">
          <ErrorState mensagem={erro || "Lead não encontrado"} onTentar={recarregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/leads">Leads</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{nome || lead.nome}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <PageHeader titulo={nome || lead.nome}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/leads")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handleArquivar}>
            {lead.arquivado ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Desarquivar
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </>
            )}
          </Button>
          {isGestor && (
            <Button variant="destructive" onClick={() => setConfirmExcluir(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="dados" className="mt-6">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4 grid gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações</CardTitle>
              <IndicadorSalvamento status={statusDados} />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualificação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Etapa no Funil</Label>
                <div className="flex items-center gap-2">
                  <StatusBadge status={statusFunil} />
                  <Select value={statusFunil} onValueChange={handleStatusChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primeiro_atendimento">Primeiro Atendimento</SelectItem>
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
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Procedimento de Interesse</Label>
                <Select
                  value={procedimentoInteresse || "nenhum"}
                  onValueChange={handleProcedimentoChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {procedimentos.map((p) => (
                      <SelectItem key={p.id} value={p.nome}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Origem</Label>
                <Input
                  value={origem}
                  onChange={(e) => handleOrigemChange(e.target.value)}
                  placeholder="whatsapp, instagram..."
                />
              </div>
            </CardContent>
          </Card>

          {lead.sobreOPaciente && (
            <Card>
              <CardHeader>
                <CardTitle>Sobre a Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  Gerenciado pelo agente IA
                </p>
                <Textarea value={lead.sobreOPaciente} readOnly rows={6} />
              </CardContent>
            </Card>
          )}
          {isGestor && (
            <Card>
              <CardHeader>
                <CardTitle>LGPD — Direitos do Titular</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportarDados}
                >
                  Exportar dados
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmAnonimizar(true)}
                >
                  Anonimizar
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          {lead.conversas.length === 0 ? (
            <EmptyState
              titulo="Sem conversas ainda"
              descricao="O histórico de conversas será exibido quando o agente IA iniciar atendimentos."
            />
          ) : (
            <div className="space-y-4">
              {lead.conversas.map((conversa) => (
                <Card key={conversa.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Conversa — <StatusBadge status={conversa.etapa} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {conversa.mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 text-sm ${
                          msg.remetente === "agente"
                            ? "bg-primary/10 ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {msg.remetente} — {new Date(msg.criadoEm).toLocaleString("pt-BR")}
                        </p>
                        <p>{msg.conteudo}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fotos" className="mt-4">
          <div className="mb-4">
            <Label
              htmlFor="upload-foto"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              {uploadingFoto ? "Enviando..." : "Enviar Foto"}
            </Label>
            <input
              id="upload-foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUploadFoto}
              disabled={uploadingFoto}
            />
          </div>

          {lead.fotos.length === 0 ? (
            <EmptyState
              icone={<ImageIcon className="h-12 w-12" />}
              titulo="Nenhuma foto"
              descricao="Envie fotos da paciente para acompanhamento."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {lead.fotos.map((foto) => (
                <div key={foto.id} className="group relative overflow-hidden rounded-lg border">
                  <img
                    src={foto.url}
                    alt={foto.descricao || "Foto do lead"}
                    className="aspect-square w-full object-cover"
                  />
                  {isGestor && (
                    <button
                      onClick={() => setConfirmFoto(foto.id)}
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {foto.descricao && (
                    <p className="p-2 text-xs text-muted-foreground">{foto.descricao}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agendamentos" className="mt-4">
          <div className="mb-4">
            <Button onClick={() => setFormAgendamento(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>

          {agendamentos.length === 0 ? (
            <EmptyState
              titulo="Sem agendamentos"
              descricao="Clique em Novo Agendamento para criar o primeiro."
            />
          ) : (
            <div className="space-y-3">
              {agendamentos.map((a) => (
                <Card key={a.id}>
                  <CardContent className="pt-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.status} variante="agendamento" />
                        <span className="text-sm font-medium">
                          {new Date(a.dataHora).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-sm text-muted-foreground">{a.duracao} min</span>
                      </div>
                      {a.procedimento && (
                        <p className="text-sm text-muted-foreground">{a.procedimento.nome}</p>
                      )}
                      {a.observacao && (
                        <p className="text-sm">{a.observacao}</p>
                      )}
                      {a.googleEventUrl && (
                        <a
                          href={a.googleEventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary underline"
                        >
                          Ver no Google Calendar
                        </a>
                      )}
                    </div>
                    {a.status !== "cancelado" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-destructive"
                        onClick={() => setConfirmCancelarAgendamento(a.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AgendamentoForm
        aberto={formAgendamento}
        onFechar={() => setFormAgendamento(false)}
        onSalvo={recarregarAgendamentos}
        leadIdInicial={id}
      />

      <ConfirmDialog
        titulo="Cancelar agendamento"
        descricao="Tem certeza que deseja cancelar este agendamento?"
        aberto={!!confirmCancelarAgendamento}
        onFechar={() => setConfirmCancelarAgendamento(null)}
        onConfirmar={handleCancelarAgendamento}
        variante="destrutivo"
        textoBotao="Cancelar agendamento"
      />

      <ConfirmDialog
        titulo="Excluir lead"
        descricao={`Tem certeza que deseja excluir "${lead.nome}"?`}
        aberto={confirmExcluir}
        onFechar={() => setConfirmExcluir(false)}
        onConfirmar={handleExcluir}
        variante="destrutivo"
        textoBotao="Excluir"
      />

      <ConfirmDialog
        titulo="Excluir foto"
        descricao="Tem certeza que deseja excluir esta foto?"
        aberto={!!confirmFoto}
        onFechar={() => setConfirmFoto(null)}
        onConfirmar={() => confirmFoto && handleExcluirFoto(confirmFoto)}
        variante="destrutivo"
        textoBotao="Excluir"
      />

      <ConfirmDialog
        titulo="Anonimizar dados do paciente"
        descricao="⚠️ Esta ação é irreversível. Todos os dados pessoais (nome, WhatsApp, e-mail, histórico) serão anonimizados permanentemente. Deseja continuar?"
        aberto={confirmAnonimizar}
        onFechar={() => setConfirmAnonimizar(false)}
        onConfirmar={handleAnonimizar}
        variante="destrutivo"
        textoBotao="Anonimizar permanentemente"
      />
    </div>
  )
}
