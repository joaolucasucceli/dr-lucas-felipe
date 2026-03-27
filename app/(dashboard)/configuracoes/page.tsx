"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, MessageCircle, ArrowRight, Zap, Loader2, Users, Clock, Stethoscope, Globe } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { useConfigGoogle } from "@/hooks/use-config-google"
import { useConfigWhatsapp } from "@/hooks/use-config-whatsapp"
import { useConfigSite } from "@/hooks/use-config-site"

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { configurado: googleConfigurado, carregando: googleCarregando, erro: googleErro, recarregar: recarregarGoogle } = useConfigGoogle()
  const { conectado: whatsappConectado, carregando: whatsappCarregando, erro: whatsappErro, recarregar: recarregarWhatsapp } = useConfigWhatsapp()
  const { configurado: siteConfigurado, carregando: siteCarregando, erro: siteErro, recarregar: recarregarSite } = useConfigSite()
  const [executandoCron, setExecutandoCron] = useState(false)

  async function handleExecutarCron() {
    setExecutandoCron(true)
    try {
      const res = await fetch("/api/agente/cron-manual", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Erro ao executar automações")
        return
      }
      const data = await res.json()
      toast.success(
        `Automações executadas: ${data.followups} follow-ups, ${data.confirmacoes} confirmações, ${data.autoClose} encerradas`
      )
    } catch {
      toast.error("Erro ao executar automações")
    } finally {
      setExecutandoCron(false)
    }
  }

  const carregando = googleCarregando || whatsappCarregando || siteCarregando

  if (carregando) {
    return (
      <div>
        <PageHeader titulo="Configurações" descricao="Gerencie as integrações e configurações do sistema" />
        <div className="mt-6"><SkeletonCard quantidade={3} /></div>
      </div>
    )
  }

  if (googleErro || whatsappErro || siteErro) {
    return (
      <div>
        <PageHeader titulo="Configurações" descricao="Gerencie as integrações e configurações do sistema" />
        <div className="mt-6">
          <ErrorState
            mensagem={googleErro || whatsappErro || siteErro || "Erro ao carregar configurações"}
            onTentar={() => { recarregarGoogle(); recarregarWhatsapp(); recarregarSite() }}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Configurações"
        descricao="Gerencie as integrações e configurações do sistema"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push("/configuracoes/google-agenda")}>
          <CardHeader className="flex flex-row items-center gap-3">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">Google Agenda</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sincronize agendamentos com o Google Calendar
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {googleConfigurado ? (
              <Badge variant="default">
                Configurado
              </Badge>
            ) : (
              <Badge variant="secondary">Não configurado</Badge>
            )}
            <Button variant="ghost" size="sm">
              Configurar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push("/configuracoes/whatsapp")}>
          <CardHeader className="flex flex-row items-center gap-3">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">WhatsApp</CardTitle>
              <p className="text-sm text-muted-foreground">
                Conecte via Uazapi para receber mensagens
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {whatsappConectado ? (
              <Badge variant="default">
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary">Desconectado</Badge>
            )}
            <Button variant="ghost" size="sm">
              Configurar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push("/configuracoes/usuarios")}>
          <CardHeader className="flex flex-row items-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">Usuários</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gerencie os usuários do sistema
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-end">
            <Button variant="ghost" size="sm">
              Gerenciar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push("/configuracoes/tipos-procedimento")}>
          <CardHeader className="flex flex-row items-center gap-3">
            <Stethoscope className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">Tipos de Procedimento</CardTitle>
              <p className="text-sm text-muted-foreground">
                Categorias personalizáveis para procedimentos
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-end">
            <Button variant="ghost" size="sm">
              Gerenciar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push("/configuracoes/site")}>
          <CardHeader className="flex flex-row items-center gap-3">
            <Globe className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">Site</CardTitle>
              <p className="text-sm text-muted-foreground">
                Dados de contato e informações da landing page
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {siteConfigurado ? (
              <Badge variant="default">
                Configurado
              </Badge>
            ) : (
              <Badge variant="secondary">Pendente</Badge>
            )}
            <Button variant="ghost" size="sm">
              Configurar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Zap className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-base">Automações</CardTitle>
              <p className="text-sm text-muted-foreground">
                Follow-ups e confirmações de consulta
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Executado automaticamente a cada hora
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Badge variant="default">
              Ativo
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExecutarCron}
              disabled={executandoCron}
            >
              {executandoCron && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Forçar execução
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
