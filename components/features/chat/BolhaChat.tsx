"use client"

import { format } from "date-fns"
import { Reply, FileText, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ReprodutorAudio } from "@/components/features/chat/ReprodutorAudio"

export interface MensagemChat {
  id: string
  tipo: string
  conteudo: string
  remetente: string
  mediaUrl?: string | null
  mediaType?: string | null
  replyToId?: string | null
  criadoEm: string | Date
  replyTo?: {
    id: string
    conteudo: string
    remetente: string
  } | null
}

interface BolhaChatProps {
  mensagem: MensagemChat
  onResponder?: (mensagem: MensagemChat) => void
  onScrollToReply?: (id: string) => void
}

const CORES_REMETENTE = {
  paciente: "bg-muted text-foreground",
  agente: "bg-blue-500/15 text-blue-950 dark:text-blue-100",
  atendente: "bg-green-500/15 text-green-950 dark:text-green-100",
} as const

const LABEL_REMETENTE: Record<string, string> = {
  paciente: "Paciente",
  agente: "Ana Júlia",
  atendente: "Atendente",
}

function linkify(texto: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const partes = texto.split(urlRegex)
  return partes.map((parte, i) =>
    urlRegex.test(parte) ? (
      <a key={i} href={parte} target="_blank" rel="noopener noreferrer" className="underline text-primary">
        {parte}
      </a>
    ) : (
      <span key={i}>{parte}</span>
    )
  )
}

function MidiaPreview({ mensagem }: { mensagem: MensagemChat }) {
  const { tipo, mediaUrl, conteudo } = mensagem

  if (!mediaUrl) return null

  if (tipo === "imagem") {
    return (
      <img
        src={mediaUrl}
        alt={conteudo || "Imagem"}
        className="max-w-[240px] rounded-md cursor-pointer"
        onClick={() => window.open(mediaUrl, "_blank")}
      />
    )
  }

  if (tipo === "video") {
    return (
      <video src={mediaUrl} controls className="max-w-[240px] rounded-md" />
    )
  }

  if (tipo === "documento") {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-background/50 hover:bg-background/80 transition-colors"
      >
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm truncate max-w-[180px]">{conteudo || "Documento"}</span>
        <Download className="h-4 w-4 text-muted-foreground ml-auto" />
      </a>
    )
  }

  if (tipo === "audio") {
    return <ReprodutorAudio src={mediaUrl} transcricao={conteudo} />
  }

  return null
}


export function BolhaChat({ mensagem, onResponder, onScrollToReply }: BolhaChatProps) {
  const ehPaciente = mensagem.remetente === "paciente"
  const corClasse = CORES_REMETENTE[mensagem.remetente as keyof typeof CORES_REMETENTE] || CORES_REMETENTE.paciente
  const temMidia = mensagem.mediaUrl && mensagem.tipo !== "texto"

  return (
    <div
      className={cn(
        "group flex flex-col max-w-[75%] gap-0.5",
        ehPaciente ? "items-start self-start" : "items-end self-end"
      )}
    >
      {/* Quote/Reply */}
      {mensagem.replyTo && (
        <button
          onClick={() => onScrollToReply?.(mensagem.replyTo!.id)}
          className="text-xs px-3 py-1.5 rounded-t-lg bg-muted/50 border-l-2 border-primary/40 text-muted-foreground text-left w-full truncate"
        >
          <span className="font-medium">{LABEL_REMETENTE[mensagem.replyTo.remetente] || mensagem.replyTo.remetente}</span>
          {": "}
          {mensagem.replyTo.conteudo.slice(0, 100)}
        </button>
      )}

      {/* Bolha */}
      <div
        className={cn(
          "relative rounded-2xl px-3 py-2 text-sm break-words",
          corClasse,
          mensagem.replyTo && "rounded-tl-none"
        )}
      >
        {/* Mídia */}
        {temMidia && <MidiaPreview mensagem={mensagem} />}

        {/* Texto */}
        {(!temMidia || mensagem.tipo === "texto") && (
          <p className="whitespace-pre-wrap">{linkify(mensagem.conteudo)}</p>
        )}

        {/* Legenda da mídia */}
        {temMidia && mensagem.tipo !== "audio" && mensagem.conteudo && !mensagem.conteudo.startsWith("[") && (
          <p className="mt-1 text-xs whitespace-pre-wrap">{mensagem.conteudo}</p>
        )}

        {/* Timestamp */}
        <span className="block text-[10px] text-muted-foreground/70 text-right mt-0.5">
          {format(new Date(mensagem.criadoEm), "HH:mm")}
        </span>

        {/* Botão reply (hover) */}
        {onResponder && (
          <button
            onClick={() => onResponder(mensagem)}
            className={cn(
              "absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-background/80 shadow-sm",
              ehPaciente ? "-right-8" : "-left-8"
            )}
          >
            <Reply className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}
