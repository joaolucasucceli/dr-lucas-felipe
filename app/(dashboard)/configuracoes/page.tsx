"use client"

import { useRouter } from "next/navigation"
import { CalendarDays, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { useConfigGoogle } from "@/hooks/use-config-google"

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { configurado, carregando } = useConfigGoogle()

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
            {carregando ? (
              <Badge variant="secondary">Carregando...</Badge>
            ) : configurado ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
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
      </div>
    </div>
  )
}
