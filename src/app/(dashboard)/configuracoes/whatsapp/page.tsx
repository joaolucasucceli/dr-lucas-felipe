"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { useConfigWhatsapp } from "@/hooks/use-config-whatsapp"
import { useQrCountdown, useWhatsappPolling } from "@/hooks/use-whatsapp-conexao"

export default function WhatsAppConfigPage() {
  const { configurado, conectado, status, numeroWhatsapp, config, carregando, erro, recarregar } =
    useConfigWhatsapp()

  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [qrcode, setQrcode] = useState("")
  const [editandoCredenciais, setEditandoCredenciais] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmarDesconectar, setConfirmarDesconectar] = useState(false)
  const [reconfigurandoWebhook, setReconfigurandoWebhook] = useState(false)

  const qrSegs = useQrCountdown(qrcode)
  const aguardandoQr = qrcode !== "" || status === "connecting"

  const onConnected = useCallback(() => {
    setQrcode("")
    recarregar()
  }, [recarregar])

  useWhatsappPolling(aguardandoQr, onConnected)

  // Inicializar estado de credenciais ao carregar config
  useEffect(() => {
    if (carregando) return
    if (configurado && config) {
      setUrl(config.uazapiUrl || "")
      setToken(config.adminToken || "")
      setEditandoCredenciais(false)
    } else {
      setEditandoCredenciais(true)
    }
  }, [carregando, configurado, config])

  if (carregando) {
    return (
      <div>
        <PageHeader titulo="WhatsApp" />
        <div className="mt-6"><LoadingState /></div>
      </div>
    )
  }

  if (erro) {
    return (
      <div>
        <PageHeader titulo="WhatsApp" />
        <div className="mt-6"><ErrorState mensagem={erro} onTentar={recarregar} /></div>
      </div>
    )
  }

  async function handleSalvarCredenciais() {
    setSalvando(true)
    try {
      const res = await fetch("/api/whatsapp/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uazapiUrl: url, adminToken: token }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao salvar credenciais", {
          description: erro.detalhe,
        })
        return
      }

      toast.success("Credenciais salvas!")
      setEditandoCredenciais(false)
      recarregar()
    } catch {
      toast.error("Erro ao salvar credenciais")
    } finally {
      setSalvando(false)
    }
  }

  async function handleConectar() {
    setSalvando(true)
    try {
      const res = await fetch("/api/whatsapp/create-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao conectar")
        return
      }

      const data = await res.json()
      setQrcode(data.qrcode || "")
    } catch {
      toast.error("Erro ao conectar")
    } finally {
      setSalvando(false)
    }
  }

  async function handleDesconectar() {
    setSalvando(true)
    try {
      const res = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao desconectar")
        return
      }

      toast.success("WhatsApp desconectado")
      setQrcode("")
      recarregar()
    } catch {
      toast.error("Erro ao desconectar")
    } finally {
      setSalvando(false)
      setConfirmarDesconectar(false)
    }
  }

  async function handleReconfigurarWebhook() {
    setReconfigurandoWebhook(true)
    try {
      const instRes = await fetch("/api/whatsapp/instances")
      const instData = await instRes.json()
      const instancia = instData.instancias?.[0]

      if (instancia) {
        const res2 = await fetch("/api/whatsapp/reconfigure-webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ configId: instancia.id }),
        })
        if (res2.ok) {
          toast.success("Webhook reconfigurado!")
          recarregar()
        } else {
          const erro = await res2.json()
          toast.error(erro.error || "Erro ao reconfigurar webhook")
        }
      }
    } catch {
      toast.error("Erro ao reconfigurar webhook")
    } finally {
      setReconfigurandoWebhook(false)
    }
  }

  // Step indicator
  const passo = !configurado ? 1 : !conectado ? 2 : 3
  const passos = [
    { num: 1, label: "Credenciais" },
    { num: 2, label: "Instância" },
    { num: 3, label: "Conectado" },
  ]

  return (
    <div>
      <PageHeader titulo="WhatsApp" descricao="Gerencie a conexão com o WhatsApp via Uazapi" />

      {/* Step indicator */}
      <div className="mt-4 flex items-center gap-1">
        {passos.map((p, i) => (
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
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-7 w-7 text-green-700 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">WhatsApp conectado</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  O sistema está recebendo mensagens do WhatsApp pela Ana Júlia.
                  {numeroWhatsapp && (
                    <>
                      {" "}Número conectado: <strong className="text-foreground">{numeroWhatsapp}</strong>.
                    </>
                  )}
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
                  <DropdownMenuItem
                    onClick={handleReconfigurarWebhook}
                    disabled={reconfigurandoWebhook}
                  >
                    {reconfigurandoWebhook ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Reconfigurar webhook
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmarDesconectar(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desconectar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        )}

        {/* ESTADO 2 — Configurado, mas não conectado */}
        {configurado && !conectado && !editandoCredenciais && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              {aguardandoQr ? (
                <div className="space-y-4 w-full">
                  {qrcode ? (
                    <div className="flex justify-center">
                      <img
                        src={qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`}
                        alt="QR Code WhatsApp"
                        className="max-w-[260px] rounded-lg border p-2"
                      />
                    </div>
                  ) : (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Abra o WhatsApp → Dispositivos Vinculados → Vincular Dispositivo
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Aguardando leitura do QR Code...
                    </div>
                    {qrSegs > 0 && (
                      <p className={cn(
                        "text-xs font-mono",
                        qrSegs <= 30 ? "text-red-500" : "text-muted-foreground"
                      )}>
                        QR expira em {Math.floor(qrSegs / 60)}:{String(qrSegs % 60).padStart(2, "0")}
                      </p>
                    )}
                    {qrSegs === 0 && qrcode && (
                      <p className="text-xs text-red-500 font-medium">QR Code expirado — clique em Conectar novamente</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Quase lá — conecte o WhatsApp</h3>
                    <p className="max-w-md text-sm text-muted-foreground">
                      As credenciais foram salvas. Falta gerar o QR Code e escanear com o WhatsApp do número da clínica.
                    </p>
                  </div>
                  <Button onClick={handleConectar} disabled={salvando} size="lg">
                    {salvando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando QR Code...
                      </>
                    ) : (
                      "Conectar"
                    )}
                  </Button>
                </>
              )}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        )}

        {/* ESTADO 1 — Não configurado OU editando credenciais */}
        {(!configurado || editandoCredenciais) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {editandoCredenciais ? "Editar credenciais" : "Acesso Uazapi"}
              </CardTitle>
              {editandoCredenciais && configurado && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUrl(config?.uazapiUrl || "")
                    setToken(config?.adminToken || "")
                    setEditandoCredenciais(false)
                  }}
                >
                  Cancelar
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Insira a URL do servidor Uazapi e o token da instância criada no painel.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="uazapiUrl">URL do Servidor</Label>
                <Input
                  id="uazapiUrl"
                  placeholder="https://producao.uazapi.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminToken">Token da Instância</Label>
                <Input
                  id="adminToken"
                  type="password"
                  placeholder="Token da instância no painel Uazapi"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onFocus={() => {
                    if (token.startsWith("••••")) setToken("")
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={handleSalvarCredenciais}
                  disabled={salvando || !url || !token || token.startsWith("••••")}
                >
                  {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Credenciais
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        titulo="Desconectar WhatsApp"
        descricao="Tem certeza que deseja desconectar? O sistema deixará de receber mensagens."
        aberto={confirmarDesconectar}
        onFechar={() => setConfirmarDesconectar(false)}
        onConfirmar={handleDesconectar}
        variante="destrutivo"
        textoBotao="Desconectar"
      />
    </div>
  )
}
