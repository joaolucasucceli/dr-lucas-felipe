"use client"

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  MessageCircle,
  Pause,
  Play,
  Sparkles,
  Star,
  Trash2,
  UserCog,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { Badge } from "@/components/ui/badge"
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

interface PageProps {
  params: Promise<{ id: string }>
}

const OPCOES_STATUS_FUNIL = [
  { value: "acolhimento", label: "Acolhimento" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "agendamento", label: "Agendamento" },
  { value: "consulta_agendada", label: "Consulta agendada" },
]

const ROTULO_ETAPA: Record<string, string> = {
  acolhimento: "Acolhimento",
  qualificacao: "Qualificação",
  agendamento: "Agendamento",
  consulta_agendada: "Consulta agendada",
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
    const res = await fetch(`/api/contatos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || "Erro ao salvar")
    }
    recarregar()
  }

  async function adicionarNota(nota: string) {
    await salvarCampo("sobreOPaciente", nota)
  }

  async function handleExcluir() {
    setProcessando(true)
    try {
      const res = await fetch(`/api/contatos/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error || "Erro")
      toast.success("Contato excluído")
      router.push("/contatos")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir")
    } finally {
      setProcessando(false)
      setConfirmExcluir(false)
    }
  }

  async function handlePromover() {
    setProcessando(true)
    try {
      const res = await fetch(`/api/contatos/${id}/promover-paciente`, {
        method: "POST",
      })
      if (!res.ok) throw new Error((await res.json()).error || "Erro")
      toast.success("Contato promovido a paciente")
      recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao promover")
    } finally {
      setProcessando(false)
      setConfirmPromover(false)
    }
  }

  async function handleToggleIa(conversaId: string, modoAtual: "ia" | "humano") {
    const rota = modoAtual === "ia" ? "pausar-ia" : "retomar-ia"
    setProcessando(true)
    try {
      const res = await fetch(`/api/atendimento/${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Erro")
      toast.success(
        modoAtual === "ia"
          ? "IA pausada — você assumiu o atendimento"
          : "IA retomou o atendimento"
      )
      recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alternar IA")
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
    return (
      <div>
        <ErrorState mensagem={erro || "Contato não encontrado"} onTentar={recarregar} />
      </div>
    )
  }

  const ehPaciente = contato.tipo === "paciente"
  // Conversa ativa = primeira do array (backend ja retorna ordenado por
  // ciclo DESC + atualizadoEm DESC). Botao Pausar/Retomar IA so faz
  // sentido pra leads com conversa em andamento.
  const conversaAtiva = contato.conversas?.[0] ?? null
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

      {/* JLU-171 (F 25/05): destaque do botão promover quando lead já passou pela consulta */}
      {!ehPaciente && ehGestor && contato.statusFunil === "consulta_agendada" && (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Pronto pra virar paciente
              </p>
              <p className="text-sm text-muted-foreground">
                Esse lead já agendou (ou compareceu) na avaliação. Promova pra abrir prontuário com anamnese, evoluções, sinais vitais e fotos médicas.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => setConfirmPromover(true)}
          >
            <Star className="mr-2 h-4 w-4" />
            Promover a paciente
          </Button>
        </div>
      )}

      <PageHeader titulo={contato.nome} descricao={descricaoHeader}>
        {!ehPaciente && contato.statusFunil && (
          <StatusBadge status={contato.statusFunil} />
        )}
        {!ehPaciente && conversaAtiva?.modoConversa === "humano" && (
          <Badge variant="secondary" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-400">
            <Pause className="h-3 w-3" />
            IA pausada
          </Badge>
        )}
        {ehGestor && !ehPaciente && (
          <Button size="sm" onClick={() => setConfirmPromover(true)}>
            <Star className="mr-2 h-4 w-4" />
            Promover a paciente
          </Button>
        )}
        {!ehPaciente && conversaAtiva && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleIa(conversaAtiva.id, conversaAtiva.modoConversa)}
            disabled={processando}
          >
            {conversaAtiva.modoConversa === "ia" ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausar IA
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
                rotuloVazio="Sem responsável"
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
