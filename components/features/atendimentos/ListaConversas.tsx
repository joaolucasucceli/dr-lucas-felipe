"use client"

import { useState } from "react"
import { Bot, Search, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useConversas, type ConversaResumo } from "@/hooks/use-conversas"
import { useRealtimeTabela } from "@/lib/realtime"

interface ListaConversasProps {
  conversaSelecionada: string | null
  onSelecionar: (conversa: ConversaResumo) => void
}

export function ListaConversas({ conversaSelecionada, onSelecionar }: ListaConversasProps) {
  const [filtro, setFiltro] = useState("todas")
  const [busca, setBusca] = useState("")
  const { conversas, carregando, recarregar } = useConversas(filtro, busca)

  // Realtime updates
  useRealtimeTabela("conversas", recarregar)
  useRealtimeTabela("mensagens", recarregar)

  return (
    <div className="flex flex-col h-full border-r">
      {/* Busca */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="px-3 py-2 border-b">
        <Tabs value={filtro} onValueChange={setFiltro}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="todas" className="text-xs flex-1">Todas</TabsTrigger>
            <TabsTrigger value="pendentes" className="text-xs flex-1">Pendentes</TabsTrigger>
            <TabsTrigger value="minhas" className="text-xs flex-1">Minhas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        {carregando && conversas.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
        )}

        {!carregando && conversas.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        )}

        {conversas.map((conversa) => {
          const ativa = conversa.id === conversaSelecionada
          const ultimaMsg = conversa.ultimaMensagem
          const tempoRelativo = conversa.ultimaMensagemEm
            ? formatDistanceToNow(new Date(conversa.ultimaMensagemEm), { addSuffix: true, locale: ptBR })
            : ""

          return (
            <button
              key={conversa.id}
              onClick={() => onSelecionar(conversa)}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 border-b",
                ativa && "bg-muted"
              )}
            >
              {/* Ícone modo */}
              <div className="shrink-0 mt-0.5">
                {conversa.modoConversa === "humano" ? (
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{conversa.lead.nome}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{tempoRelativo}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {ultimaMsg
                      ? `${ultimaMsg.remetente === "paciente" ? "" : "Você: "}${ultimaMsg.conteudo.slice(0, 60)}`
                      : "Sem mensagens"}
                  </p>
                  {conversa.naoLidas > 0 && (
                    <Badge variant="default" className="h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5 shrink-0">
                      {conversa.naoLidas}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </ScrollArea>
    </div>
  )
}
