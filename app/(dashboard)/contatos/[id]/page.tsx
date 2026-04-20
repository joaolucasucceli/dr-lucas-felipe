"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  MessageCircle,
  Phone,
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
import { GaleriaFotos } from "@/components/features/contatos/GaleriaFotos"
import { useContato } from "@/hooks/use-contato"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ContatoDetalhePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const { contato, carregando, erro, recarregar } = useContato(id)

  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [confirmPromover, setConfirmPromover] = useState(false)
  const [processando, setProcessando] = useState(false)

  const ehGestor = session?.user?.perfil === "gestor"

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/contatos")} className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{contato.nome}</h1>
            <Badge variant={ehPaciente ? "default" : "secondary"} className="capitalize">
              {contato.tipo}
            </Badge>
            {contato.arquivado && <Badge variant="outline">Arquivado</Badge>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {contato.whatsapp && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contato.whatsapp}
              </span>
            )}
            {contato.email && <span>{contato.email}</span>}
            {!ehPaciente && contato.statusFunil && (
              <StatusBadge status={contato.statusFunil} />
            )}
          </div>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="historico">
            Histórico
            {contato.conversas.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {contato.conversas.length}
              </Badge>
            )}
          </TabsTrigger>
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

        <TabsContent value="info" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados básicos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Linha label="Nome" valor={contato.nome} />
              <Linha label="WhatsApp" valor={contato.whatsapp} />
              <Linha label="Email" valor={contato.email} />
              <Linha label="Procedimento de interesse" valor={contato.procedimentoInteresse} />
              <Linha label="Origem" valor={contato.origem} />
              <Linha
                label="Responsável"
                valor={contato.responsavel ? contato.responsavel.nome : null}
              />
              {ehPaciente && (
                <>
                  <Linha label="CPF" valor={contato.cpf} />
                  <Linha
                    label="Data de nascimento"
                    valor={
                      contato.dataNascimento
                        ? new Date(contato.dataNascimento).toLocaleDateString("pt-BR")
                        : null
                    }
                  />
                  <Linha label="Sexo" valor={contato.sexo} />
                  <Linha label="Endereço" valor={contato.endereco} />
                  <Linha
                    label="Cidade / Estado"
                    valor={
                      contato.cidade && contato.estado
                        ? `${contato.cidade} / ${contato.estado}`
                        : null
                    }
                  />
                  <Linha label="Contato de emergência" valor={contato.contatoEmergencia} />
                  <Linha label="Tel. emergência" valor={contato.contatoEmergenciaTel} />
                </>
              )}
              <Linha
                label="Consentimento LGPD"
                valor={contato.consentimentoLgpd ? "Sim" : "Não"}
              />
              <Linha
                label="Criado em"
                valor={new Date(contato.criadoEm).toLocaleDateString("pt-BR")}
              />
              {contato.promovidoEm && (
                <Linha
                  label="Promovido a paciente em"
                  valor={new Date(contato.promovidoEm).toLocaleDateString("pt-BR")}
                />
              )}
            </CardContent>
          </Card>

          {contato.sobreOPaciente && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sobre o contato</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {contato.sobreOPaciente}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

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
                        Ciclo {conversa.ciclo} — {conversa.etapa}
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
                            · {new Date(m.criadoEm).toLocaleString("pt-BR")}
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

function Linha({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm">{valor || "—"}</span>
    </div>
  )
}
