"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Bot } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/features/shared/PageHeader"

export default function ComportamentoIaPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const ehGestor = session?.user?.perfil === "gestor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !ehGestor) router.replace("/dashboard")
  }, [status, ehGestor, router])

  if (status === "loading" || !ehGestor) return null

  return (
    <div>
      <PageHeader
        titulo="Comportamento da IA"
        descricao="Como a Ana Júlia conduz o atendimento da clínica"
      />

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Atendimento 100% autônomo
            </CardTitle>
            <CardDescription>
              A Ana Júlia conduz toda a jornada do paciente sozinha — do primeiro contato ao agendamento. Ela consulta a agenda, propõe horários e fecha a avaliação direto com o paciente, sem precisar da sua aprovação. Ela também mantém o cadastro e o funil sempre atualizados conforme a conversa evolui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Você só entra quando a conversa foge do escopo (uma questão médica específica ou uma reclamação séria) — nesses casos a Ana Júlia te passa o bastão e você assume aquele chat manualmente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
