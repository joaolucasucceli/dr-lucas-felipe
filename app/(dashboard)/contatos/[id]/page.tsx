"use client"

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Pause,
  Play,
  Star,
  Trash2,
  UserCog,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { formatarData, formatarWhatsapp } from "@/lib/format"
import { GaleriaFotos } from "@/components/features/contatos/GaleriaFotos"
import { CampoEditavel } from "@/components/features/contatos/CampoEditavel"
import { NotasContato } from "@/components/features/contatos/NotasContato"
import { PainelProntuarioInline } from "@/components/features/prontuario/PainelProntuarioInline"
import { useContato } from "@/hooks/use-contato"
import { useUsuarios } from "@/hooks/use-usuarios"
import { ETAPAS_FUNIL, FUNIL_LABELS } from "@/lib/funil"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

interface PageProps {
  params: Promise<{ id: string }>
}

const OPCOES_STATUS_FUNIL = ETAPAS_FUNIL.map((etapa) => ({
  value: etapa,
  label: FUNIL_LABELS[etapa],
}))

const ROTULO_ETAPA: Record<string, string> = { ...FUNIL_LABELS }

const ROTULOS_TIPO_AGENDAMENTO: Record<string, string> = {
  diagnostico: "Diagnóstico online",
  consulta_online: "Consulta online",
  consulta_presencial: "Consulta presencial",
  procedimento: "Procedimento",
  retorno: "Retorno",
  pos_operatorio: "Pós-operatório",
}

const OPCOES_SEXO = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
]

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]

const OPCOES_ESTADO = ESTADOS_BR.map((uf) => ({ value: uf, label: uf }))

const validarWhatsapp = (v: string) => /^\d{10,13}$/.test(v) ? null : "WhatsApp deve ter 10 a 13 dígitos"
const validarEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Email inválido"
const validarCpf = (v: string) => v.length === 11 ? null : "CPF deve ter 11 dígitos"
const normalizarDigitos = (v: string) => v.replace(/\D/g, "")
const normalizarCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11)
const formatarCpf = (v: string) => {
  const d = v.replace(/\D/g, "")
  if (d.length !== 11) return v
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export default function ContatoDetalhePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const { contato, carregando, erro, recarregar } = useContato(id)
  const { dados: usuarios } = useUsuarios({ pagina: 1, porPagina: 100 })

  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [confirmPromover, setConfirmPromover] = useState(false)
  const [processando, setProcessando] = useState(false)

  const ehGestor = session?.user?.perfil === "gestor"

  const opcoesResponsavel = useMemo(
    () =>
      usuarios
        .filter((u) => u.tipo === "humano")
        .map((u) => ({ value: u.id, label: u.nome })),
    [usuarios]
  )

  async function salvarCampo(campo: string, valor: unknown) {
    await fetchJson(`/api/contatos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    })
    recarregar()
  }

  async function adicionarNota(nota: string) {
    await salvarCampo("sobreOPaciente", nota)
  }

  async function handleExcluir() {
    setProcessando(true)
    try {
      await fetchJson(`/api/contatos/${id}`, { method: "DELETE" })
      toast.success("Contato excluído")
      router.push("/contatos")
    } catch (err) {
      toast.error(normalizarErroApi(err, "Erro ao excluir").mensagem)
    } finally {
      setProcessando(false)
      setConfirmExcluir(false)
    }
  }

  async function handlePromover() {
    setProcessando(true)
    try {
      await fetchJson(`/api/contatos/${id}/promover-paciente`, {
        method: "POST",
      })
      toast.success("Contato promovido a paciente")
      recarregar()
    } catch (err) {
      toast.error(normalizarErroApi(err, "Erro ao promover").mensagem)
    } finally {
      setProcessando(false)
      setConfirmPromover(false)
    }
  }

  async function handleToggleIa(conversaId: string, modoAtual: "ia" | "humano") {
    const rota = modoAtual === "ia" ? "pausar-ia" : "retomar-ia"
    setProcessando(true)
    try {
      await fetchJson(`/api/atendimento/${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId }),
      })
      toast.success(
        modoAtual === "ia"
          ? "IA pausada — você assumiu o atendimento"
          : "IA retomou o atendimento"
      )
      recarregar()
    } catch (err) {
      toast.error(normalizarErroApi(err, "Erro ao alternar IA").mensagem)
    } finally {
      setProcessando(false)
    }
  }

  async function handleMarcarAgendamentoRealizado(agendamentoId: string) {
    setProcessando(true)
    try {
      await fetchJson(`/api/agendamentos/${agendamentoId}/realizar`, {
        method: "POST",
      })
      toast.success("Atendimento marcado como realizado")
      recarregar()
    } catch (err) {
      toast.error(normalizarErroApi(err, "Erro ao marcar como realizado").mensagem)
    } finally {
      setProcessando(false)
    }
  }

  if (carregando) {
    return (
      <div>
        <SkeletonCard />
      </div>
    )
  }

  if (erro || !contato) {
    const acoesErro =
      erro?.kind === "not_found"
        ? [
            { label: "Voltar para Contatos", href: "/contatos" },
            { label: "Ir para Atendimentos", href: "/atendimentos", variant: "outline" as const },
          ]
        : erro?.kind === "unauthorized"
          ? [{ label: "Ir para login", href: "/login" }]
          : erro?.kind === "forbidden"
            ? [{ label: "Voltar para Contatos", href: "/contatos" }]
            : undefined

    return (
      <div>
        <ErrorState
          erro={erro}
          titulo={!erro ? "Contato não encontrado" : undefined}
          mensagem={!erro ? "Esse contato pode ter sido excluído ou não está mais disponível." : undefined}
          acoes={acoesErro}
          onTentar={recarregar}
        />
      </div>
    )
  }

  const ehPaciente = contato.tipo === "paciente"
  // Conversa ativa = primeira do array (backend ja retorna ordenado por
  // ciclo DESC + atualizadoEm DESC). A ação manual muda para atendimento
  // humano ou retoma a IA em leads com conversa em andamento.
  const conversaAtiva = contato.conversas?.[0] ?? null
  const atendimentoIA = !contato.responsavelId && conversaAtiva?.modoConversa === "ia"
  const possuiAgendamentoRealizado = contato.agendamentos.some(
    (agendamento) => Boolean(agendamento.realizadoEm)
  )
  const mostrarControleIa =
    !ehPaciente &&
    conversaAtiva &&
    !(contato.statusFunil === "atendimento_humano" && possuiAgendamentoRealizado)
  const dataNascimentoInput = contato.dataNascimento
    ? new Date(contato.dataNascimento).toISOString().slice(0, 10)
    : ""

  const descricaoHeader = [
    ehPaciente ? "Paciente" : "Lead",
  ]
    .filter(Boolean)
    .join(" • ")

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/contatos")} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <PageHeader titulo={contato.nome} descricao={descricaoHeader}>
        {ehGestor && !ehPaciente && (
          <Button size="sm" onClick={() => setConfirmPromover(true)}>
            <Star className="mr-2 h-4 w-4" />
            Promover a paciente
          </Button>
        )}
        {mostrarControleIa && conversaAtiva && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleIa(conversaAtiva.id, conversaAtiva.modoConversa)}
            disabled={processando}
          >
            {conversaAtiva.modoConversa === "ia" ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Mudar para atendimento humano
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Retomar IA
              </>
            )}
          </Button>
        )}
        {ehGestor && (
          <Button size="sm" variant="destructive" onClick={() => setConfirmExcluir(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Coluna esquerda: Dados → Fotos → Observações */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do contato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <CampoEditavel
                label="Nome"
                valor={contato.nome}
                onSalvar={(v) => salvarCampo("nome", v)}
                permiteVazio={false}
                validador={(v) => (v.trim().length >= 2 ? null : "Mínimo 2 caracteres")}
              />
              <CampoEditavel
                label="WhatsApp"
                valor={contato.whatsapp}
                tipo="tel"
                onSalvar={(v) => salvarCampo("whatsapp", v ?? "")}
                normalizar={normalizarDigitos}
                mascara={formatarWhatsapp}
                validador={validarWhatsapp}
                placeholder="5511999998888"
              />
              <CampoEditavel
                label="Email"
                valor={contato.email}
                tipo="email"
                onSalvar={(v) => salvarCampo("email", v ?? "")}
                validador={validarEmail}
                placeholder="email@exemplo.com"
              />
              <CampoEditavel
                label="Procedimento de interesse"
                valor={contato.procedimentoInteresse}
                onSalvar={(v) => salvarCampo("procedimentoInteresse", v ?? "")}
              />
              <CampoEditavel
                label="Origem"
                valor={contato.origem}
                onSalvar={(v) => salvarCampo("origem", v ?? "")}
                placeholder="instagram, indicação, site…"
              />
              <CampoEditavel
                label="Responsável"
                valor={contato.responsavelId}
                tipo="select"
                opcoes={opcoesResponsavel}
                onSalvar={(v) => salvarCampo("responsavelId", v)}
                rotuloVazio={atendimentoIA ? "Ana Júlia / IA" : "Sem responsável"}
              />
              {!ehPaciente && (
                <CampoEditavel
                  label="Status do funil"
                  valor={contato.statusFunil}
                  tipo="select"
                  opcoes={OPCOES_STATUS_FUNIL}
                  onSalvar={(v) => salvarCampo("statusFunil", v)}
                  permiteVazio={false}
                />
              )}

              {ehPaciente && (
                <>
                  <CampoEditavel
                    label="CPF"
                    valor={contato.cpf}
                    onSalvar={(v) => salvarCampo("cpf", v ?? "")}
                    normalizar={normalizarCpf}
                    mascara={formatarCpf}
                    validador={validarCpf}
                    placeholder="000.000.000-00"
                  />
                  <CampoEditavel
                    label="Data de nascimento"
                    valor={dataNascimentoInput}
                    tipo="date"
                    onSalvar={(v) => salvarCampo("dataNascimento", v ?? "")}
                  />
                  <CampoEditavel
                    label="Sexo"
                    valor={contato.sexo}
                    tipo="select"
                    opcoes={OPCOES_SEXO}
                    onSalvar={(v) => salvarCampo("sexo", v)}
                  />
                  <CampoEditavel
                    label="Cidade"
                    valor={contato.cidade}
                    onSalvar={(v) => salvarCampo("cidade", v ?? "")}
                  />
                  <CampoEditavel
                    label="Estado"
                    valor={contato.estado}
                    tipo="select"
                    opcoes={OPCOES_ESTADO}
                    onSalvar={(v) => salvarCampo("estado", v ?? "")}
                    rotuloVazio="Não informado"
                  />
                  <div className="sm:col-span-2">
                    <CampoEditavel
                      label="Endereço"
                      valor={contato.endereco}
                      onSalvar={(v) => salvarCampo("endereco", v ?? "")}
                    />
                  </div>
                  <CampoEditavel
                    label="Contato de emergência"
                    valor={contato.contatoEmergencia}
                    onSalvar={(v) => salvarCampo("contatoEmergencia", v ?? "")}
                  />
                  <CampoEditavel
                    label="Telefone de emergência"
                    valor={contato.contatoEmergenciaTel}
                    tipo="tel"
                    onSalvar={(v) => salvarCampo("contatoEmergenciaTel", v ?? "")}
                    normalizar={normalizarDigitos}
                    mascara={formatarWhatsapp}
                  />
                </>
              )}

              <CampoEditavel
                label="Consentimento LGPD"
                valor={contato.consentimentoLgpd ? "Sim" : "Não"}
                onSalvar={async () => {}}
                editavel={false}
              />
              <CampoEditavel
                label="Criado em"
                valor={formatarData(contato.criadoEm, "dd/MM/yyyy")}
                onSalvar={async () => {}}
                editavel={false}
              />
              {contato.promovidoEm && (
                <CampoEditavel
                  label="Promovido a paciente em"
                  valor={formatarData(contato.promovidoEm, "dd/MM/yyyy")}
                  onSalvar={async () => {}}
                  editavel={false}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Fotos
                {contato.fotos.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({contato.fotos.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GaleriaFotos
                contatoId={contato.id}
                fotosIniciais={contato.fotos.map((f) => ({
                  id: f.id,
                  url: f.url,
                  descricao: f.descricao,
                  categoria: f.categoria,
                  tipoAnalise: f.tipoAnalise,
                  criadoEm: f.criadoEm,
                }))}
                isGestor={ehGestor}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações sobre o contato</CardTitle>
            </CardHeader>
            <CardContent>
              <NotasContato texto={contato.sobreOPaciente} onAdicionar={adicionarNota} />
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita: Histórico (lead) ou Prontuário (paciente) */}
        <div className="space-y-6">
          {!ehPaciente && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4" />
                    Agendamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {contato.agendamentos.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      Nenhum agendamento registrado.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {contato.agendamentos.map((agendamento) => {
                        const agendamentoAtivo =
                          agendamento.status === "agendado" ||
                          agendamento.status === "remarcado"
                        const agendamentoRealizado = Boolean(agendamento.realizadoEm)
                        const podeMarcarRealizado =
                          ehGestor &&
                          agendamentoAtivo &&
                          !agendamentoRealizado &&
                          contato.statusFunil !== "atendimento_humano"

                        return (
                          <div
                            key={agendamento.id}
                            className="rounded-lg border bg-card/50 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">
                                    {formatarData(
                                      agendamento.dataHora,
                                      "dd/MM/yyyy 'às' HH:mm"
                                    )}
                                  </span>
                                  {agendamentoRealizado ? (
                                    <Badge
                                      variant="secondary"
                                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                    >
                                      Realizado
                                    </Badge>
                                  ) : (
                                    <StatusBadge
                                      status={agendamento.status}
                                      variante="agendamento"
                                    />
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>
                                    Tipo:{" "}
                                    {ROTULOS_TIPO_AGENDAMENTO[agendamento.tipo] ??
                                      agendamento.tipo ??
                                      "Diagnóstico online"}
                                  </p>
                                  <p>
                                    Procedimento:{" "}
                                    {agendamento.procedimento?.nome ?? "Não informado"}
                                  </p>
                                  {agendamento.observacao && (
                                    <p className="whitespace-pre-line">
                                      Observação: {agendamento.observacao}
                                    </p>
                                  )}
                                  {agendamento.realizadoEm && (
                                    <p>
                                      Realizado em{" "}
                                      {formatarData(
                                        agendamento.realizadoEm,
                                        "dd/MM/yyyy 'às' HH:mm"
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {agendamento.googleEventUrl && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a
                                      href={agendamento.googleEventUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Google Agenda
                                    </a>
                                  </Button>
                                )}
                                {podeMarcarRealizado && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleMarcarAgendamentoRealizado(agendamento.id)
                                    }
                                    disabled={processando}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Marcar como realizado
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de atendimento</CardTitle>
              </CardHeader>
              <CardContent>
                {contato.conversas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-6">
                    Sem conversas registradas.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {contato.conversas.map((conversa) => (
                      <div key={conversa.id} className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {ROTULO_ETAPA[conversa.etapa] ?? conversa.etapa}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {conversa.modoConversa === "ia" ? "Ana Júlia" : "Atendente"}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                          {conversa.mensagens.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sem mensagens</p>
                          ) : (
                            conversa.mensagens.map((m) => {
                              const ehLead = m.remetente === "paciente"
                              const rotuloRemetente = ehLead
                                ? "Lead"
                                : m.remetente === "atendente"
                                  ? "Atendente"
                                  : "Ana Júlia"
                              return (
                                <div
                                  key={m.id}
                                  className={`flex ${ehLead ? "justify-start" : "justify-end"}`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                                      ehLead
                                        ? "bg-muted rounded-bl-sm"
                                        : "bg-primary/15 rounded-br-sm"
                                    }`}
                                  >
                                    <div className="text-[10px] uppercase text-muted-foreground mb-1">
                                      {rotuloRemetente}{" "}·{" "}
                                      {formatarData(m.criadoEm, "dd/MM/yyyy 'às' HH:mm")}
                                    </div>
                                    <div className="whitespace-pre-wrap">{m.conteudo}</div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </>
          )}

          {ehPaciente && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Prontuário
                  {contato.prontuario && (
                    <span className="ml-auto text-xs font-normal text-muted-foreground font-mono">
                      Nº {String(contato.prontuario.numero).padStart(4, "0")}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PainelProntuarioInline pacienteId={id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        titulo="Promover a paciente?"
        descricao={`${contato.nome} vai virar paciente. O histórico de WhatsApp, fotos e agendamentos são mantidos. Um prontuário é criado.`}
        aberto={confirmPromover}
        onFechar={() => setConfirmPromover(false)}
        onConfirmar={handlePromover}
        textoBotao="Promover"
        carregando={processando}
      />

      <ConfirmDialog
        titulo="Excluir contato?"
        descricao={`${contato.nome} e todos os dados relacionados serão removidos. Ação irreversível.`}
        aberto={confirmExcluir}
        onFechar={() => setConfirmExcluir(false)}
        onConfirmar={handleExcluir}
        variante="destrutivo"
        textoBotao="Excluir"
        carregando={processando}
      />
    </div>
  )
}
