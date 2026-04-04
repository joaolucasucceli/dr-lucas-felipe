"use client"

import { useState, useEffect, Suspense } from "react"
import { Plus, Kanban, MessageSquare, Bot, User, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { KanbanView } from "@/components/features/kanban/KanbanView"
import { LeadForm } from "@/components/features/leads/LeadForm"
import { NovoAtendimentoModal } from "@/components/features/kanban/NovoAtendimentoModal"
import { ListaConversas } from "@/components/features/atendimentos/ListaConversas"
import { PainelChat } from "@/components/features/chat/PainelChat"
import { UploadArquivo } from "@/components/features/chat/UploadArquivo"
import { GravadorAudio } from "@/components/features/chat/GravadorAudio"
import { type ConversaResumo } from "@/hooks/use-conversas"
import { toast } from "sonner"

interface Procedimento {
  id: string
  nome: string
}

export default function AtendimentosPage() {
  const [novoLeadAberto, setNovoLeadAberto] = useState(false)
  const [novoAtendimentoAberto, setNovoAtendimentoAberto] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
  const [tab, setTab] = useState("kanban")

  // Chat state
  const [conversaSelecionada, setConversaSelecionadaRaw] = useState<ConversaResumo | null>(null)

  function setConversaSelecionada(conversa: ConversaResumo | null) {
    setConversaSelecionadaRaw(conversa)
    // Marcar mensagens como lidas
    if (conversa) {
      fetch("/api/atendimento/marcar-lida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: conversa.id }),
      }).catch(() => {})
    }
  }
  const [mostrarUpload, setMostrarUpload] = useState(false)
  const [mostrarGravador, setMostrarGravador] = useState(false)
  const [alterandoModo, setAlterandoModo] = useState(false)

  useEffect(() => {
    fetch("/api/procedimentos")
      .then((r) => r.json())
      .then((data) => setProcedimentos(data.dados || []))
      .catch(() => {})
  }, [])

  async function handleAssumirDevolver() {
    if (!conversaSelecionada) return
    setAlterandoModo(true)

    const ehHumano = conversaSelecionada.modoConversa === "humano"
    const rota = ehHumano ? "/api/atendimento/devolver" : "/api/atendimento/assumir"

    try {
      const res = await fetch(rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: conversaSelecionada.id }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao alterar modo")
        return
      }

      const novoModo = ehHumano ? "ia" : "humano"
      setConversaSelecionada({ ...conversaSelecionada, modoConversa: novoModo })
      toast.success(ehHumano ? "Conversa devolvida para a IA" : "Você assumiu a conversa")
    } catch {
      toast.error("Erro ao alterar modo")
    } finally {
      setAlterandoModo(false)
    }
  }

  async function handleMidiaEnviada(url: string, tipo: string, nomeArquivo: string) {
    if (!conversaSelecionada) return
    setMostrarUpload(false)

    try {
      const res = await fetch("/api/atendimento/enviar-midia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversaId: conversaSelecionada.id,
          arquivoUrl: url,
          tipo,
          nomeDocumento: nomeArquivo,
        }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao enviar mídia")
      }
    } catch {
      toast.error("Erro ao enviar mídia")
    }
  }

  async function handleAudioEnviado(url: string) {
    if (!conversaSelecionada) return
    setMostrarGravador(false)

    try {
      const res = await fetch("/api/atendimento/enviar-midia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversaId: conversaSelecionada.id,
          arquivoUrl: url,
          tipo: "audio",
        }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao enviar áudio")
      }
    } catch {
      toast.error("Erro ao enviar áudio")
    }
  }

  return (
    <div className="h-full">
      <PageHeader
        titulo="Atendimentos"
        descricao="Visualize e gerencie o funil de atendimento"
      >
        <Button
          variant="outline"
          onClick={() => setNovoAtendimentoAberto(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Atendimento
        </Button>
        <Button onClick={() => setNovoLeadAberto(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="kanban">
            <Kanban className="mr-1.5 h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Tab Kanban (original) */}
        <TabsContent value="kanban" className="mt-4">
          <Suspense>
            <KanbanView externalRefresh={refreshKey} />
          </Suspense>
        </TabsContent>

        {/* Tab Chat (novo) */}
        <TabsContent value="chat" className="mt-0">
          <div className="flex h-[calc(100vh-220px)] border rounded-lg overflow-hidden bg-background">
            {/* Lista de conversas (esquerda) */}
            <div className="w-[340px] shrink-0">
              <ListaConversas
                conversaSelecionada={conversaSelecionada?.id || null}
                onSelecionar={setConversaSelecionada}
              />
            </div>

            {/* Chat (direita) */}
            <div className="flex-1 flex flex-col">
              {conversaSelecionada ? (
                <>
                  {/* Header do chat */}
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-3">
                      {conversaSelecionada.modoConversa === "humano" ? (
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{conversaSelecionada.lead.nome}</span>
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {conversaSelecionada.lead.statusFunil.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{conversaSelecionada.lead.whatsapp}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={conversaSelecionada.modoConversa === "humano" ? "outline" : "default"}
                        size="sm"
                        onClick={handleAssumirDevolver}
                        disabled={alterandoModo}
                      >
                        {alterandoModo && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {conversaSelecionada.modoConversa === "humano" ? "Devolver p/ IA" : "Assumir"}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/leads/${conversaSelecionada.leadId}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Upload ou Gravador */}
                  {mostrarUpload && (
                    <div className="px-4 py-2 border-b">
                      <UploadArquivo
                        conversaId={conversaSelecionada.id}
                        onEnviado={handleMidiaEnviada}
                        onFechar={() => setMostrarUpload(false)}
                      />
                    </div>
                  )}

                  {mostrarGravador && (
                    <div className="px-4 py-2 border-b">
                      <GravadorAudio
                        conversaId={conversaSelecionada.id}
                        onEnviado={handleAudioEnviado}
                        onFechar={() => setMostrarGravador(false)}
                      />
                    </div>
                  )}

                  {/* PainelChat */}
                  <div className="flex-1 min-h-0">
                    <PainelChat
                      conversaId={conversaSelecionada.id}
                      leadId={conversaSelecionada.leadId}
                      modoConversa={conversaSelecionada.modoConversa}
                      onAnexar={() => { setMostrarUpload(true); setMostrarGravador(false) }}
                      onGravar={() => { setMostrarGravador(true); setMostrarUpload(false) }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Selecione uma conversa para começar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <LeadForm
        aberto={novoLeadAberto}
        onFechar={() => setNovoLeadAberto(false)}
        onSucesso={() => {
          setNovoLeadAberto(false)
          setRefreshKey((k) => k + 1)
        }}
        procedimentos={procedimentos}
      />

      <NovoAtendimentoModal
        aberto={novoAtendimentoAberto}
        onFechar={() => setNovoAtendimentoAberto(false)}
        onSucesso={() => {
          setNovoAtendimentoAberto(false)
          setRefreshKey((k) => k + 1)
        }}
      />
    </div>
  )
}
