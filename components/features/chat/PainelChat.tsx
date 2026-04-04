"use client"

import { useRef, useEffect, useState, useCallback, type KeyboardEvent } from "react"
import { Send, Paperclip, Mic, X, Loader2 } from "lucide-react"
import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BolhaChat, type MensagemChat } from "@/components/features/chat/BolhaChat"
import { useMensagens } from "@/hooks/use-mensagens"
import { useRealtimeTabela } from "@/lib/realtime"
import { toast } from "sonner"

interface PainelChatProps {
  conversaId: string | null
  leadId?: string
  modoConversa?: string
  onAnexar?: () => void
  onGravar?: () => void
}

export function PainelChat({ conversaId, leadId, modoConversa, onAnexar, onGravar }: PainelChatProps) {
  const { mensagens, carregando, adicionarMensagem, recarregar } = useMensagens(conversaId)
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [replyTo, setReplyTo] = useState<MensagemChat | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mensagensRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const digitandoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Enviar indicador de digitação com debounce de 2s
  const enviarIndicadorDigitacao = useCallback(() => {
    if (!conversaId || modoConversa !== "humano") return
    if (digitandoTimerRef.current) return // Já tem timer ativo
    fetch("/api/atendimento/digitando", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversaId }),
    }).catch(() => {})
    digitandoTimerRef.current = setTimeout(() => {
      digitandoTimerRef.current = null
    }, 2000)
  }, [conversaId, modoConversa])

  // Auto-scroll ao receber novas mensagens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens.length])

  // Realtime: recarregar quando chegar mensagem nova
  useRealtimeTabela("mensagens", recarregar)

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [texto])

  const enviarMensagem = useCallback(async () => {
    if (!texto.trim() || !conversaId || enviando) return

    const textoEnviar = texto.trim()
    setTexto("")
    setEnviando(true)

    // Optimistic update
    const msgOtimista: MensagemChat = {
      id: `temp_${Date.now()}`,
      tipo: "texto",
      conteudo: textoEnviar,
      remetente: "atendente",
      criadoEm: new Date().toISOString(),
      replyToId: replyTo?.id || null,
      replyTo: replyTo ? { id: replyTo.id, conteudo: replyTo.conteudo, remetente: replyTo.remetente } : null,
    }
    adicionarMensagem(msgOtimista)
    setReplyTo(null)

    try {
      const res = await fetch("/api/atendimento/enviar-mensagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversaId,
          texto: textoEnviar,
          replyToId: replyTo?.id,
        }),
      })

      if (!res.ok) {
        const erro = await res.json()
        toast.error(erro.error || "Erro ao enviar mensagem")
      }
    } catch {
      toast.error("Erro ao enviar mensagem")
    } finally {
      setEnviando(false)
      textareaRef.current?.focus()
    }
  }, [texto, conversaId, enviando, replyTo, adicionarMensagem])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  function scrollToReply(id: string) {
    const el = mensagensRef.current.get(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("ring-2", "ring-primary/50")
      setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 2000)
    }
  }

  if (!conversaId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Selecione uma conversa para começar</p>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Agrupar mensagens por data para separadores
  const mensagensComSeparador: { tipo: "separador" | "mensagem"; data?: Date; mensagem?: MensagemChat }[] = []
  let ultimaData: Date | null = null
  for (const msg of mensagens) {
    const dataMensagem = new Date(msg.criadoEm)
    if (!ultimaData || !isSameDay(ultimaData, dataMensagem)) {
      mensagensComSeparador.push({ tipo: "separador", data: dataMensagem })
      ultimaData = dataMensagem
    }
    mensagensComSeparador.push({ tipo: "mensagem", mensagem: msg })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Lista de mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {mensagens.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Nenhuma mensagem ainda
          </div>
        )}

        {mensagensComSeparador.map((item, i) => {
          if (item.tipo === "separador") {
            return (
              <div key={`sep-${i}`} className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  {format(item.data!, "dd 'de' MMMM", { locale: ptBR })}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )
          }

          const msg = item.mensagem!
          return (
            <div
              key={msg.id}
              ref={(el) => { if (el) mensagensRef.current.set(msg.id, el) }}
              className="flex transition-all duration-300 rounded-lg"
            >
              <BolhaChat
                mensagem={msg}
                onResponder={setReplyTo}
                onScrollToReply={scrollToReply}
              />
            </div>
          )
        })}
      </div>

      {/* Barra de reply */}
      {replyTo && (
        <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2">
          <div className="flex-1 text-xs truncate">
            <span className="font-medium">Respondendo a {replyTo.remetente}</span>
            {": "}
            {replyTo.conteudo.slice(0, 80)}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t px-4 py-3 flex items-end gap-2">
        {onAnexar && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onAnexar}>
            <Paperclip className="h-4 w-4" />
          </Button>
        )}

        <Textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); enviarIndicadorDigitacao() }}
          onKeyDown={handleKeyDown}
          placeholder={modoConversa === "humano" ? "Digite sua mensagem..." : "Assuma a conversa para enviar mensagens"}
          disabled={modoConversa !== "humano"}
          className="min-h-[44px] max-h-[160px] resize-none"
          rows={1}
        />

        {onGravar && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onGravar} disabled={modoConversa !== "humano"}>
            <Mic className="h-4 w-4" />
          </Button>
        )}

        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={enviarMensagem}
          disabled={!texto.trim() || enviando || modoConversa !== "humano"}
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
