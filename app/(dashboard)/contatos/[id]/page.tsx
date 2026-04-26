"use client"

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  MessageCircle,
  Star,
  Trash2,
  UserCog,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { StatusBadge } from "@/components/features/shared/StatusBadge"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { formatarData, formatarWhatsapp } from "@/lib/format"
import { GaleriaFotos } from "@/components/features/contatos/GaleriaFotos"
import { CampoEditavel } from "@/components/features/contatos/CampoEditavel"
import { NotasContato } from "@/components/features/contatos/NotasContato"
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

  async function handleArquivar() {
    if (!contato) return
    try {
      const res = await fetch(`/api/contatos/${id}/arquivar`, { method: "PATCH" })
      if (!res.ok) throw new Error((await res.json()).error || "Erro")
      toast.success(contato.arquivado ? "Desarquivado" : "Arquivado")
      recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao arquivar")
    }
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
  const dataNascimentoInput = contato.dataNascimento
    ? new Date(contato.dataNascimento).toISOString().slice(0, 10)
    : ""

  const descricaoHeader = [
    ehPaciente ? "Paciente" : "Lead",
    contato.arquivado ? "Arquivado" : null,
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
        {!ehPaciente && contato.statusFunil && (
          <StatusBadge status={contato.statusFunil} />
        )}
        {ehGestor && !ehPaciente && (
          <Button size="sm" onClick={() => setConfirmPromover(true)}>
            <Star className="mr-2 h-4 w-4" />
            Promover a paciente
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleArquivar}>
          {contato.arquivado ? (
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
        {ehGestor && (
          <Button size="sm" variant="destructive" onClick={() => setConfirmExcluir(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        )}
      </PageHeader>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          {!ehPaciente && (
            <TabsTrigger value="historico">
              Histórico de atendimento
              {contato.conversas.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {contato.conversas.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="fotos">
            Fotos
            {contato.fotos.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {contato.fotos.length}
              </Badge>
            )}
          </TabsTrigger>
          {ehPaciente && <TabsTrigger value="prontuario">Prontuário</TabsTrigger>}
        </TabsList>

        <TabsContent value="info" className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
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
              <CardTitle className="text-base">Observações sobre o contato</CardTitle>
            </CardHeader>
            <CardContent>
              <NotasContato texto={contato.sobreOPaciente} onAdicionar={adicionarNota} />
            </CardContent>
          </Card>
        </TabsContent>

        {!ehPaciente && (
          <TabsContent value="historico" className="mt-6">
            {contato.conversas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Sem conversas registradas.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {contato.conversas.map((conversa) => (
                  <Card key={conversa.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">
                          {ROTULO_ETAPA[conversa.etapa] ?? conversa.etapa}
                        </CardTitle>
                      </div>
                      <Badge variant={conversa.modoConversa === "ia" ? "default" : "outline"} className="text-xs">
                        {conversa.modoConversa === "ia" ? "Ana Júlia" : "Atendente"}
                      </Badge>
                    </CardHeader>
                  <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                    {conversa.mensagens.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem mensagens</p>
                    ) : (
                      conversa.mensagens.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-md p-2 text-sm ${
                            m.remetente === "paciente"
                              ? "bg-muted"
                              : "bg-primary/10"
                          }`}
                        >
                          <div className="text-[10px] uppercase text-muted-foreground mb-1">
                            {m.remetente === "paciente"
                              ? "Paciente"
                              : m.remetente === "atendente"
                                ? "Atendente"
                                : "Ana Júlia"}{" "}
                            · {formatarData(m.criadoEm, "dd/MM/yyyy 'as' HH:mm")}
                          </div>
                          <div className="whitespace-pre-wrap">{m.conteudo}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </TabsContent>
        )}

        <TabsContent value="fotos" className="mt-6">
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
        </TabsContent>

        {ehPaciente && (
          <TabsContent value="prontuario" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Prontuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contato.prontuario ? (
                  <>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">
                          {contato.prontuario._count?.evolucoes ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Evoluções</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {contato.prontuario._count?.documentos ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Documentos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {contato.prontuario._count?.fotos ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Fotos médicas</div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      Nº Prontuário: <span className="font-mono">{contato.prontuario.numero}</span>
                    </div>
                    <div className="flex justify-center">
                      <Link href={`/contatos/${id}/prontuario`}>
                        <Button size="sm">Abrir prontuário</Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground text-center p-6">
                    Prontuário não encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

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
