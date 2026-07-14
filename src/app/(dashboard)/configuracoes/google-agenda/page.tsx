"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, MoreHorizontal, RefreshCw, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { SelecionarAgenda } from "@/components/features/google-agenda/SelecionarAgenda"
import { useConfigGoogle } from "@/hooks/use-config-google"

function GoogleAgendaConfigInner() {
  const searchParams = useSearchParams()
  const { configurado, config, carregando, erro, recarregar } = useConfigGoogle()

  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [conectando, setConectando] = useState(false)
  const [confirmRemover, setConfirmRemover] = useState(false)
  const [editandoCredenciais, setEditandoCredenciais] = useState(false)

  // Detectar retorno do OAuth
  useEffect(() => {
    const conectado = searchParams.get("conectado")
    const erro = searchParams.get("erro")

    if (conectado === "true") {
      toast.success("Google Calendar conectado com sucesso!")
      recarregar()
    } else if (erro) {
      const msgs: Record<string, string> = {
        acesso_negado: "Acesso negado pelo Google",
        sem_refresh_token: "Token não retornado — tente revogar o acesso e reconectar",
        falha_token: "Falha ao obter token do Google",
        sem_config: "Salve as credenciais antes de conectar",
      }
      toast.error(msgs[erro] || "Erro ao conectar com o Google")
    }
  }, [searchParams, recarregar])

  useEffect(() => {
    if (config) {
      setClientId(config.clientId)
      setClientSecret(config.clientSecret)
    }
  }, [config])

  function handleFocus(valor: string, setter: (v: string) => void) {
    if (valor.startsWith("••••")) setter("")
  }

  async function handleSalvar() {
    const body: Record<string, string> = {}

    if (!clientId.startsWith("••••")) body.clientId = clientId
    else if (config) body.clientId = config.clientId

    if (!clientSecret.startsWith("••••")) body.clientSecret = clientSecret

    if (!body.clientId || !body.clientSecret) {
      toast.error("Preencha o Client ID e o Client Secret")
      return
    }

    setSalvando(true)
    try {
      const res = await fetch("/api/configuracoes/google-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao salvar credenciais")
        return
      }

      toast.success("Credenciais salvas")
      setEditandoCredenciais(false)
      recarregar()
    } catch {
      toast.error("Erro ao salvar credenciais")
    } finally {
      setSalvando(false)
    }
  }

  async function handleConectar() {
    setConectando(true)
    try {
      const res = await fetch("/api/configuracoes/google-agenda/auth-url")
      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao gerar URL de autorização")
        setConectando(false)
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } catch {
      toast.error("Erro ao conectar com o Google")
      setConectando(false)
    }
  }

  async function handleRemover() {
    try {
      const res = await fetch("/api/configuracoes/google-agenda", { method: "DELETE" })
      if (!res.ok) {
        toast.error("Erro ao remover configuração")
        return
      }
      toast.success("Configuração removida")
      setClientId("")
      setClientSecret("")
      setEditandoCredenciais(false)
      recarregar()
    } catch {
      toast.error("Erro ao remover configuração")
    } finally {
      setConfirmRemover(false)
    }
  }

  if (carregando) {
    return (
      <div>
        <PageHeader titulo="Google Agenda" />
        <div className="mt-6"><LoadingState /></div>
      </div>
    )
  }

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Google Agenda" />
        <div className="mt-6"><ErrorState mensagem={erro} onTentar={recarregar} /></div>
      </div>
    )
  }

  const conectado = configurado && config?.conectado
  const passo = !configurado ? 1 : !config?.conectado ? 2 : 3

  return (
    <div>
      <PageHeader
        titulo="Google Agenda"
        descricao="Conecte o sistema ao Google Calendar para sincronizar agendamentos"
      />

      {/* Step indicator */}
      <div className="mt-4 flex items-center gap-1">
        {[
          { num: 1, label: "Credenciais" },
          { num: 2, label: "Autorizar Google" },
          { num: 3, label: "Conectado" },
        ].map((p, i) => (
          <div key={p.num} className="flex items-center gap-1">
            {i > 0 && <div className="h-px w-6 bg-border" />}
            <div className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              p.num < passo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
              p.num === passo ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            )}>
              {p.num < passo ? <CheckCircle2 className="h-3 w-3" /> : <span>{p.num}</span>}
              {p.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6">
        {/* ESTADO 3 — Conectado */}
        {conectado && !editandoCredenciais && (
          <>
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-7 w-7 text-green-700 dark:text-green-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Sincronização ativa</h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Sua agenda está conectada ao Google Calendar. A Ana Júlia já consulta horários disponíveis e cria eventos automaticamente quando agenda uma avaliação.
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <MoreHorizontal className="mr-1 h-4 w-4" />
                      Gerenciar integração
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={() => setEditandoCredenciais(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar credenciais
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleConectar} disabled={conectando}>
                      {conectando ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Reconectar Google
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setConfirmRemover(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover integração
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agenda destino</CardTitle>
              </CardHeader>
              <CardContent>
                <SelecionarAgenda
                  calendarIdAtual={config?.calendarId ?? null}
                  onSalvo={recarregar}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* ESTADO 2 — Credenciais salvas mas nao conectado */}
        {configurado && !config?.conectado && !editandoCredenciais && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Quase lá — autorize o Google</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  As credenciais foram salvas. Falta autorizar o acesso à sua conta do Google Calendar.
                </p>
              </div>
              <Button onClick={handleConectar} disabled={conectando} size="lg">
                {conectando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecionando...
                  </>
                ) : (
                  "Conectar com Google"
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <MoreHorizontal className="mr-1 h-4 w-4" />
                    Gerenciar credenciais
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setEditandoCredenciais(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar credenciais
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmRemover(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover integração
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        )}

        {/* ESTADO 1 — Nao configurado OU editando credenciais */}
        {(!configurado || editandoCredenciais) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {editandoCredenciais ? "Editar credenciais" : "Credenciais de Integração"}
              </CardTitle>
              {editandoCredenciais && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditandoCredenciais(false)
                    if (config) {
                      setClientId(config.clientId)
                      setClientSecret(config.clientSecret)
                    }
                  }}
                >
                  Cancelar
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Client ID</Label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  onFocus={() => handleFocus(clientId, setClientId)}
                  placeholder="571255265442-xxx.apps.googleusercontent.com"
                />
              </div>

              <div className="grid gap-2">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  onFocus={() => handleFocus(clientSecret, setClientSecret)}
                  placeholder="GOCSPX-..."
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleSalvar} disabled={salvando}>
                  {salvando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Credenciais"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card de instrucoes — aparece apenas durante setup inicial */}
        {!configurado && (
          <Card>
            <CardHeader>
              <CardTitle>Como obter as credenciais</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none text-muted-foreground">
              <ol className="list-decimal space-y-2 pl-4">
                <li>
                  Acesse o <strong>Google Cloud Console</strong> (console.cloud.google.com)
                </li>
                <li>Crie um novo projeto ou selecione um existente</li>
                <li>
                  Ative a <strong>Google Calendar API</strong> em &quot;APIs &amp; Services&quot; → &quot;Library&quot;
                </li>
                <li>
                  Crie credenciais <strong>OAuth 2.0</strong> em &quot;Credentials&quot; → &quot;Create Credentials&quot; →{" "}
                  &quot;OAuth client ID&quot; (tipo: <strong>Web application</strong>)
                </li>
                <li>
                  Em &quot;Authorized redirect URIs&quot; adicione:{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    https://dr-lucas-central.vercel.app/api/configuracoes/google-agenda/callback
                  </code>
                </li>
                <li>
                  Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong>, cole aqui e clique em{" "}
                  <strong>Salvar Credenciais</strong>
                </li>
                <li>
                  Clique em <strong>Conectar com Google</strong> e autorize o acesso — o token será salvo automaticamente
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        titulo="Remover integração"
        descricao="Tem certeza que deseja remover a integração com o Google Agenda? Os agendamentos existentes não serão afetados, mas a Ana Júlia deixará de criar eventos no Google Calendar."
        aberto={confirmRemover}
        onFechar={() => setConfirmRemover(false)}
        onConfirmar={handleRemover}
        variante="destrutivo"
        textoBotao="Remover"
      />
    </div>
  )
}

export default function GoogleAgendaConfigPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GoogleAgendaConfigInner />
    </Suspense>
  )
}
