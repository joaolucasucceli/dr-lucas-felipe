"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Trash2, Archive, ArchiveRestore, Plus, Users, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
import { GaleriaFotos } from "@/components/features/leads/GaleriaFotos"

export default function LeadDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string

  const { lead, carregando, erro, recarregar } = useLead(id)

  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [confirmAnonimizar, setConfirmAnonimizar] = useState(false)
  const [confirmConverter, setConfirmConverter] = useState(false)
  const [convertendo, setConvertendo] = useState(false)
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
    session?.user?.perfil === "gestor"

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

  async function handleConverter() {
    setConvertendo(true)
    try {
      const res = await fetch("/api/pacientes/converter-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao converter")
      }
      const data = await res.json()
      toast.success(data.jaCriado ? "Paciente já existente" : "Lead convertido em paciente!")
      recarregar()
      router.push(`/pacientes/${data.paciente.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao converter lead")
    } finally {
      setConvertendo(false)
      setConfirmConverter(false)
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
          {/* Botão Converter/Ver Paciente */}
          {lead.paciente ? (
            <Button variant="outline" onClick={() => router.push(`/pacientes/${lead.paciente!.id}`)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver Paciente
            </Button>
          ) : isGestor ? (
            <Button variant="outline" onClick={() => setConfirmConverter(true)} disabled={convertendo}>
              <Users className="mr-2 h-4 w-4" />
              Converter em Paciente
            </Button>
          ) : null}
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
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={cn(statusDados === "pendente" && "border-orange-400 focus-visible:ring-orange-400")}
                  title="Salva automaticamente"
                />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className={cn(statusDados === "pendente" && "border-orange-400 focus-visible:ring-orange-400")}
                  title="Salva automaticamente"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(statusDados === "pendente" && "border-orange-400 focus-visible:ring-orange-400")}
                  title="Salva automaticamente"
                />
              </div>
              <div className="grid gap-2">
                <Label>Responsável</Label>
                <Input
                  value={lead?.responsavel?.nome || "Sem responsável"}
                  readOnly
                  className="bg-muted cursor-default"
                />
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
          ) : (() => {
            // Agrupar conversas por ciclo
            const ciclosMap = new Map<number, typeof lead.conversas>()
            for (const conversa of lead.conversas) {
              const ciclo = conversa.ciclo ?? 1
              if (!ciclosMap.has(ciclo)) ciclosMap.set(ciclo, [])
              ciclosMap.get(ciclo)!.push(conversa)
            }
            const ciclosOrdenados = Array.from(ciclosMap.entries()).sort((a, b) => b[0] - a[0])

            return (
              <div className="space-y-6">
                {ciclosOrdenados.map(([ciclo, conversas]) => (
                  <div key={ciclo}>
                    {lead.ciclosCompletos > 0 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {ciclo === 1 ? "1º Atendimento" : `${ciclo}º Atendimento (Retorno)`}
                      </p>
                    )}
                    <div className="space-y-4">
                      {conversas.map((conversa) => (
                        <Card key={conversa.id}>
                          <CardHeader>
                            <CardTitle className="text-sm">
                              Conversa — <StatusBadge status={conversa.etapa} />
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {conversa.mensagens.map((msg) => {
                              const ehAgente = msg.remetente === "agente"
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex ${ehAgente ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                                      ehAgente
                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                        : "bg-muted text-foreground rounded-tl-sm"
                                    }`}
                                  >
                                    <p className={`text-xs mb-1 font-medium ${ehAgente ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                      {ehAgente ? "Ana Júlia" : lead.nome.split(" ")[0]}
                                    </p>
                                    <p>{msg.conteudo}</p>
                                    <p className={`text-xs mt-1 text-right ${ehAgente ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                      {new Date(msg.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </TabsContent>

        <TabsContent value="fotos" className="mt-4">
          <GaleriaFotos
            leadId={lead.id}
            fotosIniciais={lead.fotos}
            isGestor={isGestor}
          />
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
          ) : (() => {
            // Agrupar agendamentos por ciclo
            const ciclosMap = new Map<number, typeof agendamentos>()
            for (const ag of agendamentos) {
              const ciclo = ag.ciclo ?? 1
              if (!ciclosMap.has(ciclo)) ciclosMap.set(ciclo, [])
              ciclosMap.get(ciclo)!.push(ag)
            }
            const ciclosOrdenados = Array.from(ciclosMap.entries()).sort((a, b) => b[0] - a[0])

            return (
              <div className="space-y-6">
                {ciclosOrdenados.map(([ciclo, ags]) => (
                  <div key={ciclo}>
                    {ciclosMap.size > 1 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {ciclo === 1 ? "1º Atendimento" : `${ciclo}º Atendimento (Retorno)`}
                      </p>
                    )}
                    <div className="space-y-3">
                      {ags.map((a) => (
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
                              </div>
                              {a.procedimento && (
                                <p className="text-sm text-muted-foreground">{a.procedimento.nome}</p>
                              )}
                              {a.observacao && (
                                <p className="text-sm">{a.observacao}</p>
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
                  </div>
                ))}
              </div>
            )
          })()}
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
        titulo="Anonimizar dados do paciente"
        descricao="⚠️ Esta ação é irreversível. Todos os dados pessoais (nome, WhatsApp, e-mail, histórico) serão anonimizados permanentemente. Deseja continuar?"
        aberto={confirmAnonimizar}
        onFechar={() => setConfirmAnonimizar(false)}
        onConfirmar={handleAnonimizar}
        variante="destrutivo"
        textoBotao="Anonimizar permanentemente"
      />

      <ConfirmDialog
        titulo="Converter em Paciente"
        descricao={`Converter "${lead.nome}" em paciente? O lead será arquivado automaticamente e um prontuário será criado.`}
        aberto={confirmConverter}
        onFechar={() => setConfirmConverter(false)}
        onConfirmar={handleConverter}
        textoBotao={convertendo ? "Convertendo..." : "Converter"}
      />
    </div>
  )
}
