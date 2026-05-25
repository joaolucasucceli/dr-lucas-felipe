"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Bot, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"

// JLU-170 v2 (B 25/05): toggle pra modo pre-aprovacao opcional de agendamento.
// Lucas pediu literal: "antes de serem passadas datas e horarios aos
// pacientes, a equipe entre em contato comigo para alinhamento previo".

export default function ComportamentoIaPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [exigirAprovacao, setExigirAprovacao] = useState<boolean | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const ehGestor = session?.user?.perfil === "gestor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !ehGestor) router.replace("/dashboard")
  }, [status, ehGestor, router])

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return
    let cancel = false
    fetch(`/api/usuarios/${session.user.id}`)
      .then((r) => r.json())
      .then((u) => {
        if (!cancel) setExigirAprovacao(Boolean(u.exigirAprovacaoAgendamento))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setCarregando(false)
      })
    return () => {
      cancel = true
    }
  }, [status, session?.user?.id])

  async function toggleFlag(novoValor: boolean) {
    if (!session?.user?.id || salvando) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/usuarios/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exigirAprovacaoAgendamento: novoValor }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Erro ao salvar")
      }
      setExigirAprovacao(novoValor)
      toast.success(
        novoValor
          ? "Pré-aprovação ativada — agendamentos vão pedir seu OK antes"
          : "Pré-aprovação desativada — Ana Júlia agenda direto"
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSalvando(false)
    }
  }

  if (status === "loading" || !ehGestor) return null

  return (
    <div>
      <PageHeader
        titulo="Comportamento da IA"
        descricao="Configure como a Ana Júlia se comporta nos pontos onde você quer controle direto"
      />

      <div className="mt-6 space-y-4">
        {carregando ? (
          <SkeletonCard />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Pré-aprovação de agendamento
              </CardTitle>
              <CardDescription>
                Quando ativado, a Ana Júlia <strong>não fecha o horário direto com o paciente</strong>. Em vez disso, ela manda uma mensagem no seu WhatsApp pessoal com o horário pretendido e abre uma solicitação em <code className="px-1 rounded bg-muted text-xs">/aprovacoes-pendentes</code>. Você aprova, sugere outro horário ou cancela — depois disso ela responde o paciente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label htmlFor="exigirAprovacao" className="text-base">
                    Exigir minha aprovação antes de agendar
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {exigirAprovacao
                      ? "ATIVO — Ana Júlia vai pedir seu OK pra cada agendamento."
                      : "DESATIVADO — Ana Júlia agenda direto e só te avisa depois (ping no WhatsApp)."}
                  </p>
                </div>
                <Switch
                  id="exigirAprovacao"
                  checked={!!exigirAprovacao}
                  onCheckedChange={toggleFlag}
                  disabled={salvando}
                />
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Como funciona quando ativo:
                </p>
                <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
                  <li>Paciente escolhe horário com a Ana Júlia.</li>
                  <li>Ana Júlia diz: <em>&quot;vou só alinhar com o Dr. Lucas e te confirmo&quot;</em>.</li>
                  <li>Você recebe WhatsApp + entra em <code className="text-xs bg-background px-1 rounded">/aprovacoes-pendentes</code>.</li>
                  <li>Você aprova (vira agendamento real) OU sugere outro horário OU cancela.</li>
                  <li>Ana Júlia responde o paciente conforme sua decisão.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
