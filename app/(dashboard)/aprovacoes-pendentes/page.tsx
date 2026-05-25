"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Check, X, Clock, MessageSquareWarning, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { ConfirmDialog } from "@/components/features/shared/ConfirmDialog"
import { formatarData, formatarWhatsapp } from "@/lib/format"

// JLU-170 v2 (B 25/05): pagina onde o Dr. Lucas aprova/sugere outro/cancela
// os agendamentos que a Ana Julia pediu pre-aprovacao (config ativa).

interface Aprovacao {
  id: string
  dataHora: string
  status: string
  criadoEm: string
  email: string
  observacao: string | null
  contatoId: string
  contato: { id: string; nome: string; whatsapp: string | null } | null
  procedimento: { id: string; nome: string; escopoOferta: string | null } | null
}

export default function AprovacoesPendentesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [dados, setDados] = useState<Aprovacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState<string | null>(null)
  const [confirmRejeitar, setConfirmRejeitar] = useState<Aprovacao | null>(null)
  const [confirmCancelar, setConfirmCancelar] = useState<Aprovacao | null>(null)
  const [motivoRej, setMotivoRej] = useState("")

  const ehGestor = session?.user?.perfil === "gestor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !ehGestor) router.replace("/dashboard")
  }, [status, ehGestor, router])

  const carregar = () => {
    setCarregando(true)
    fetch("/api/aprovacoes-agendamento?status=aguardando&limite=100")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erro"))))
      .then((j) => setDados(j.aprovacoes ?? []))
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"))
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    if (status !== "authenticated" || !ehGestor) return
    carregar()
  }, [status, ehGestor])

  async function executar(a: Aprovacao, acao: "aprovar" | "rejeitar" | "cancelar", motivoRejeicao?: string) {
    setProcessando(a.id)
    try {
      const res = await fetch(`/api/aprovacoes-agendamento/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, motivoRejeicao }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Erro")
      const labels = {
        aprovar: "Agendamento criado + paciente avisado",
        rejeitar: "Rejeitado + paciente avisado pra escolher outro horário",
        cancelar: "Cancelado + paciente avisado",
      }
      toast.success(labels[acao])
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro")
    } finally {
      setProcessando(null)
      setConfirmRejeitar(null)
      setConfirmCancelar(null)
      setMotivoRej("")
    }
  }

  if (status === "loading" || !ehGestor) return null

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Aprovações pendentes" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={carregar} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Aprovações pendentes"
        descricao="Horários que a Ana Júlia separou pra você confirmar antes de fechar com o paciente."
      />

      <div className="mt-6 space-y-3">
        {carregando ? (
          <SkeletonCard />
        ) : dados.length === 0 ? (
          <EmptyState
            titulo="Nada pendente"
            descricao="Quando a Ana Júlia precisar do seu OK pra um horário, aparece aqui. (Ative a pré-aprovação em Configurações > Comportamento da IA.)"
          />
        ) : (
          dados.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      {a.contato?.nome ?? "(paciente)"}
                      <Badge variant="outline" className="text-[10px] border-amber-500/50 bg-amber-500/10 text-amber-600">
                        Aguardando seu OK
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Quer fechar pra{" "}
                      <strong className="text-foreground">
                        {formatarData(a.dataHora, "EEEE, dd/MM/yyyy 'às' HH:mm")}
                      </strong>
                      {a.procedimento && (
                        <>
                          {" · "}
                          <span>{a.procedimento.escopoOferta || a.procedimento.nome}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  {a.contato?.id && (
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/contatos/${a.contato!.id}`)}>
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Ver conversa
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>WhatsApp: <span className="font-mono">{a.contato?.whatsapp ? formatarWhatsapp(a.contato.whatsapp) : "—"}</span></p>
                  <p>Email pro convite: <span className="font-mono">{a.email}</span></p>
                  <p>Solicitado em: {formatarData(a.criadoEm, "dd/MM 'às' HH:mm")}</p>
                  {a.observacao && <p className="italic">&quot;{a.observacao}&quot;</p>}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={processando === a.id}
                    onClick={() => executar(a, "aprovar")}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processando === a.id}
                    onClick={() => setConfirmRejeitar(a)}
                  >
                    <MessageSquareWarning className="mr-1 h-4 w-4" />
                    Sugerir outro horário
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={processando === a.id}
                    onClick={() => setConfirmCancelar(a)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal "Sugerir outro" — pede motivo opcional */}
      <ConfirmDialog
        aberto={!!confirmRejeitar}
        titulo="Sugerir outro horário"
        descricao={
          <>
            <p>
              A Ana Júlia vai avisar o paciente que esse horário não rolou e oferecer outras opções.
            </p>
            <div className="mt-3 space-y-2">
              <Label htmlFor="motivo">Motivo (opcional — vai aparecer pro paciente)</Label>
              <Input
                id="motivo"
                placeholder="ex: tenho compromisso fixo nesse dia"
                value={motivoRej}
                onChange={(e) => setMotivoRej(e.target.value)}
              />
            </div>
          </>
        }
        textoBotao="Sugerir outro"
        onFechar={() => { setConfirmRejeitar(null); setMotivoRej("") }}
        onConfirmar={() => confirmRejeitar && executar(confirmRejeitar, "rejeitar", motivoRej || undefined)}
      />

      {/* Modal "Cancelar" */}
      <ConfirmDialog
        aberto={!!confirmCancelar}
        titulo="Cancelar consulta?"
        descricao="A Ana Júlia vai avisar o paciente que você não vai poder atender e fechar o atendimento. Use quando o paciente realmente não dá pra atender."
        textoBotao="Cancelar consulta"
        variante="destrutivo"
        onFechar={() => setConfirmCancelar(null)}
        onConfirmar={() => confirmCancelar && executar(confirmCancelar, "cancelar")}
      />
    </div>
  )
}
