"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Loader2, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { LoadingState } from "@/components/features/shared/LoadingState"
import { useConfigWhatsapp } from "@/hooks/use-config-whatsapp"

type Etapa = "credenciais" | "qrcode" | "conectando" | "conectado"

export default function WhatsAppConfigPage() {
  const router = useRouter()
  const { configurado, conectado, status, numeroWhatsapp, config, carregando, recarregar } =
    useConfigWhatsapp()

  const [etapa, setEtapa] = useState<Etapa>("credenciais")
  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [qrcode, setQrcode] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [confirmarDesconectar, setConfirmarDesconectar] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Determinar etapa inicial baseado no estado
  useEffect(() => {
    if (carregando) return

    if (conectado) {
      setEtapa("conectado")
    } else if (configurado && config) {
      setUrl(config.uazapiUrl || "")
      setToken(config.adminToken || "")
      if (config.instanceId) {
        setEtapa("conectando")
      }
    }
  }, [carregando, conectado, configurado, config])

  // Polling no estado "conectando"
  useEffect(() => {
    if (etapa !== "conectando") {
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
          setEtapa("conectado")
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
  }, [etapa, recarregar])

  async function handleTestarConexao() {
    setSalvando(true)
    try {
      const res = await fetch("/api/whatsapp/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uazapiUrl: url, adminToken: token }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao testar conexão", {
          description: erro.detalhe,
        })
        return
      }

      toast.success("Conexão bem-sucedida!")
      setEtapa("qrcode")
      recarregar()
    } catch {
      toast.error("Erro ao testar conexão")
    } finally {
      setSalvando(false)
    }
  }

  async function handleCriarInstancia() {
    setSalvando(true)
    try {
      const res = await fetch("/api/whatsapp/create-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao criar instância")
        return
      }

      const data = await res.json()
      setQrcode(data.qrcode)
      setEtapa("conectando")
      recarregar()
    } catch {
      toast.error("Erro ao criar instância")
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
      setEtapa("credenciais")
      setQrcode("")
      recarregar()
    } catch {
      toast.error("Erro ao desconectar")
    } finally {
      setSalvando(false)
      setConfirmarDesconectar(false)
    }
  }

  if (carregando) return <LoadingState />

  return (
    <div>
      <PageHeader titulo="WhatsApp" descricao="Conecte o sistema ao WhatsApp via Uazapi">
        <Button variant="outline" size="sm" onClick={() => router.push("/configuracoes")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
      </PageHeader>

      <div className="mt-4 mb-6 flex items-center gap-2">
        {conectado ? (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Wifi className="mr-1 h-3 w-3" />
            Conectado {numeroWhatsapp ? `(${numeroWhatsapp})` : ""}
          </Badge>
        ) : (
          <Badge variant="secondary">
            <WifiOff className="mr-1 h-3 w-3" />
            Desconectado
          </Badge>
        )}
      </div>

      {/* Stepper visual */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        {(["credenciais", "qrcode", "conectando", "conectado"] as Etapa[]).map((e, i) => {
          const labels = ["1. Credenciais", "2. QR Code", "3. Conectando", "4. Conectado"]
          const ativo = e === etapa
          const completo = (["credenciais", "qrcode", "conectando", "conectado"] as Etapa[]).indexOf(etapa) > i

          return (
            <div key={e} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-6 bg-border" />}
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  ativo
                    ? "bg-primary text-primary-foreground"
                    : completo
                      ? "bg-green-100 text-green-800"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {labels[i]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Etapa 1 — Credenciais */}
      {etapa === "credenciais" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credenciais Uazapi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="uazapiUrl">URL do Uazapi</Label>
              <Input
                id="uazapiUrl"
                placeholder="https://api.uazapi.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="adminToken">Admin Token</Label>
              <Input
                id="adminToken"
                type="password"
                placeholder="Token de administrador"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onFocus={() => {
                  if (token.startsWith("••••")) setToken("")
                }}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleTestarConexao}
              disabled={salvando || !url || !token || token.startsWith("••••")}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar Conexão
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Etapa 2 — QR Code */}
      {etapa === "qrcode" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Criar Instância WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique no botão abaixo para criar uma instância e gerar o QR Code para conexão.
            </p>
            <Button onClick={handleCriarInstancia} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Instância
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Etapa 3 — Conectando (QR + polling) */}
      {etapa === "conectando" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Escaneie o QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrcode ? (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${qrcode}`}
                  alt="QR Code WhatsApp"
                  className="max-w-[280px] rounded-lg border p-2"
                />
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp no celular → Dispositivos Vinculados → Vincular Dispositivo
              </p>
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando conexão...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 4 — Conectado */}
      {etapa === "conectado" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              WhatsApp Conectado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {numeroWhatsapp && (
              <p className="text-sm">
                Número conectado: <strong>{numeroWhatsapp}</strong>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              O sistema está recebendo mensagens do WhatsApp.
            </p>
            <Button
              variant="destructive"
              onClick={() => setConfirmarDesconectar(true)}
            >
              Desconectar
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        titulo="Desconectar WhatsApp"
        descricao="Tem certeza que deseja desconectar a instância WhatsApp? O sistema deixará de receber mensagens."
        aberto={confirmarDesconectar}
        onFechar={() => setConfirmarDesconectar(false)}
        onConfirmar={handleDesconectar}
        variante="destrutivo"
        textoBotao="Desconectar"
      />
    </div>
  )
}
