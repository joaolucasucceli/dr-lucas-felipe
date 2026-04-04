"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, CheckCircle2, Edit2, Loader2, Plus, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { useConfigWhatsapp } from "@/hooks/use-config-whatsapp"

export default function WhatsAppConfigPage() {
  const router = useRouter()
  const { configurado, conectado, status, numeroWhatsapp, config, carregando, erro, recarregar } =
    useConfigWhatsapp()

  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [nome, setNome] = useState("")
  const [qrcode, setQrcode] = useState("")
  const [qrSegs, setQrSegs] = useState(0)
  const qrExpiraRef = useRef<number | null>(null)
  const [editandoCredenciais, setEditandoCredenciais] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmarDesconectar, setConfirmarDesconectar] = useState(false)
  const [reconfigurandoWebhook, setReconfigurandoWebhook] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown quando QR está visível
  useEffect(() => {
    if (qrcode) {
      qrExpiraRef.current = Date.now() + 120_000
      setQrSegs(120)
      const iv = setInterval(() => {
        const restante = Math.max(0, Math.ceil(((qrExpiraRef.current ?? 0) - Date.now()) / 1000))
        setQrSegs(restante)
        if (restante === 0) clearInterval(iv)
      }, 1000)
      return () => clearInterval(iv)
    } else {
      qrExpiraRef.current = null
      setQrSegs(0)
    }
  }, [qrcode])

  // Inicializar estado de credenciais
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

  // Polling quando aguardando conexão
  useEffect(() => {
    const aguardando = qrcode !== "" || status === "connecting"

    if (!aguardando) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/status")
        const data = await res.json()
        if (data.ativo && data.status === "connected") {
          setQrcode("")
          recarregar()
        }
      } catch {
        // Ignorar erros de polling
      }
    }, 5000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [qrcode, status, recarregar])

  if (carregando) return <LoadingState />
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
      const res = await fetch("/api/whatsapp/reconfigure-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: config?.instanceId ? undefined : "" }),
      })

      // Buscar configId real
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

  const aguardandoQr = qrcode !== "" || status === "connecting"

  // Step indicator
  const passo = !configurado ? 1 : !conectado ? 2 : 3
  const passos = [
    { num: 1, label: "Credenciais" },
    { num: 2, label: "Instância" },
    { num: 3, label: "Conectado" },
  ]

  return (
    <div className="space-y-4">
      <PageHeader titulo="WhatsApp" descricao="Gerencie a conexão com o WhatsApp via Uazapi">
        <Button variant="outline" size="sm" onClick={() => router.push("/configuracoes")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
      </PageHeader>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-2">
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

      {/* Card 1 — Credenciais */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Acesso Uazapi</CardTitle>
          {configurado && !editandoCredenciais && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditandoCredenciais(true)}
            >
              <Edit2 className="mr-1 h-3 w-3" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editandoCredenciais ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Insira a URL do servidor Uazapi e o token da instância criada no painel.
              </p>
              <div>
                <Label htmlFor="uazapiUrl">URL do Servidor</Label>
                <Input
                  id="uazapiUrl"
                  placeholder="https://producao.uazapi.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
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
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSalvarCredenciais}
                  disabled={salvando || !url || !token || token.startsWith("••••")}
                >
                  {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Credenciais
                </Button>
                {configurado && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setUrl(config?.uazapiUrl || "")
                      setToken(config?.adminToken || "")
                      setEditandoCredenciais(false)
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-12">URL</span>
                <span className="font-mono text-xs">{config?.uazapiUrl}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-12">Token</span>
                <span className="font-mono text-xs">{config?.adminToken}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — Instância */}
      {configurado && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Instância WhatsApp
              {conectado ? (
                <Badge variant="default" className="text-xs">
                  <Wifi className="mr-1 h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <WifiOff className="mr-1 h-3 w-3" />
                  Desconectado
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Conectado */}
            {conectado && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    Número conectado:{" "}
                    <strong>{numeroWhatsapp || "—"}</strong>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  O sistema está recebendo mensagens do WhatsApp.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReconfigurarWebhook}
                    disabled={reconfigurandoWebhook}
                  >
                    {reconfigurandoWebhook ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                    Reconfigurar Webhook
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmarDesconectar(true)}
                    disabled={salvando}
                  >
                    Desconectar
                  </Button>
                </div>
              </div>
            )}

            {/* Aguardando QR */}
            {!conectado && aguardandoQr && (
              <div className="space-y-4">
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
                <div className="text-center space-y-1">
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
            )}

            {/* Desconectado */}
            {!conectado && !aguardandoQr && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  A instância está desconectada. Clique em Conectar para gerar o QR Code.
                </p>
                <Button onClick={handleConectar} disabled={salvando}>
                  {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Conectar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
