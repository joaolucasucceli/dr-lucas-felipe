"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { useConfigGoogle } from "@/hooks/use-config-google"

function CampoComTooltip({
  label,
  dica,
  children,
}: {
  label: string
  dica: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1">
        <Label>{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{dica}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {children}
    </div>
  )
}

export default function GoogleAgendaConfigPage() {
  const router = useRouter()
  const { configurado, config, carregando, recarregar } = useConfigGoogle()

  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [calendarId, setCalendarId] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [confirmRemover, setConfirmRemover] = useState(false)

  useEffect(() => {
    if (config) {
      setClientId(config.clientId)
      setClientSecret(config.clientSecret)
      setRefreshToken(config.refreshToken)
      setCalendarId(config.calendarId)
    }
  }, [config])

  function handleFocus(
    valor: string,
    setter: (v: string) => void
  ) {
    if (valor.startsWith("••••")) {
      setter("")
    }
  }

  async function handleSalvar() {
    const body: Record<string, string> = {}

    if (!clientId.startsWith("••••")) body.clientId = clientId
    if (!clientSecret.startsWith("••••")) body.clientSecret = clientSecret
    if (!refreshToken.startsWith("••••")) body.refreshToken = refreshToken
    if (!calendarId.startsWith("••••")) body.calendarId = calendarId

    // Se editando e nenhum campo secreto foi alterado, manter os existentes
    if (configurado) {
      if (!body.clientId && config) body.clientId = config.clientId
      if (!body.calendarId && config) body.calendarId = config.calendarId
    }

    // Validar que todos os campos obrigatórios estão presentes
    if (!body.clientId || !body.clientSecret || !body.refreshToken || !body.calendarId) {
      toast.error("Preencha todos os campos")
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
        toast.error(erro.error || "Erro ao salvar configuração")
        return
      }

      toast.success("Configuração salva")
      recarregar()
    } catch {
      toast.error("Erro ao salvar configuração")
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemover() {
    try {
      const res = await fetch("/api/configuracoes/google-agenda", {
        method: "DELETE",
      })

      if (!res.ok) {
        toast.error("Erro ao remover configuração")
        return
      }

      toast.success("Configuração removida")
      setClientId("")
      setClientSecret("")
      setRefreshToken("")
      setCalendarId("")
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

  return (
    <div>
      <PageHeader
        titulo="Google Agenda"
        descricao="Conecte o sistema ao Google Calendar para sincronizar agendamentos"
      >
        <Button variant="outline" onClick={() => router.push("/configuracoes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Configurações
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Credenciais de Integração</CardTitle>
            {configurado ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                Configurado
              </Badge>
            ) : (
              <Badge variant="secondary">Não configurado</Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            <CampoComTooltip
              label="Client ID"
              dica="Obtido no Console do Google Cloud (APIs & Services → Credentials)"
            >
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onFocus={() => handleFocus(clientId, setClientId)}
                placeholder="123456789-abc.apps.googleusercontent.com"
              />
            </CampoComTooltip>

            <CampoComTooltip
              label="Client Secret"
              dica="Gerado junto com o Client ID no Console do Google Cloud"
            >
              <Input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                onFocus={() => handleFocus(clientSecret, setClientSecret)}
                placeholder="GOCSPX-..."
              />
            </CampoComTooltip>

            <CampoComTooltip
              label="Refresh Token"
              dica="Gerado no OAuth 2.0 Playground (developers.google.com/oauthplayground)"
            >
              <Input
                type="password"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                onFocus={() => handleFocus(refreshToken, setRefreshToken)}
                placeholder="1//0a..."
              />
            </CampoComTooltip>

            <CampoComTooltip
              label="Calendar ID"
              dica="Use 'primary' para a agenda principal ou copie o ID nas configurações do Google Calendar"
            >
              <Input
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                onFocus={() => handleFocus(calendarId, setCalendarId)}
                placeholder="primary"
              />
            </CampoComTooltip>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSalvar} disabled={salvando}>
                {salvando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Configuração"
                )}
              </Button>
              {configurado && (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmRemover(true)}
                >
                  Remover Configuração
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Como obter as credenciais</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-4">
              <li>
                Acesse o{" "}
                <strong>Google Cloud Console</strong>{" "}
                (console.cloud.google.com)
              </li>
              <li>
                Crie um novo projeto ou selecione um existente
              </li>
              <li>
                Ative a <strong>Google Calendar API</strong> em{" "}
                &quot;APIs &amp; Services&quot; → &quot;Library&quot;
              </li>
              <li>
                Crie credenciais <strong>OAuth 2.0</strong> em{" "}
                &quot;Credentials&quot; → &quot;Create Credentials&quot; →{" "}
                &quot;OAuth client ID&quot; (tipo: Web application)
              </li>
              <li>
                Copie o <strong>Client ID</strong> e o{" "}
                <strong>Client Secret</strong>
              </li>
              <li>
                Acesse o{" "}
                <strong>OAuth 2.0 Playground</strong>{" "}
                (developers.google.com/oauthplayground), autorize o escopo{" "}
                <code>https://www.googleapis.com/auth/calendar</code>{" "}
                e troque o Authorization Code pelo{" "}
                <strong>Refresh Token</strong>
              </li>
              <li>
                Para o <strong>Calendar ID</strong>: use{" "}
                <code>primary</code> para sua agenda principal,
                ou acesse Google Calendar → Configurações da agenda →
                copie o &quot;ID da agenda&quot;
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        titulo="Remover configuração"
        descricao="Tem certeza que deseja remover a integração com o Google Agenda? Os agendamentos existentes não serão afetados."
        aberto={confirmRemover}
        onFechar={() => setConfirmRemover(false)}
        onConfirmar={handleRemover}
        variante="destrutivo"
        textoBotao="Remover"
      />
    </div>
  )
}
