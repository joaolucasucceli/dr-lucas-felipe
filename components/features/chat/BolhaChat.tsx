"use client"

import { useState } from "react"
import { formatarData } from "@/lib/format"
import Image from "next/image"
import { Reply, FileText, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

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

const PREFIX_PLACEHOLDER = [
  "[áudio recebido",
  "[imagem recebida",
  "[Documento recebido",
  "[Vídeo recebido",
]

/** Extrai texto útil do conteudo da mensagem. Retorna "" se for só placeholder. */
function extrairCaption(conteudo: string): string {
  if (!conteudo) return ""
  for (const pref of PREFIX_PLACEHOLDER) {
    if (conteudo.startsWith(pref)) return ""
  }
  if (conteudo.startsWith("[Imagem]:")) {
    return conteudo.replace(/^\[Imagem\]:\s*/, "")
  }
  if (conteudo.startsWith("[Áudio transcrito]:")) {
    return conteudo.replace(/^\[Áudio transcrito\]:\s*/, "")
  }
  return conteudo
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

function ImagemComLightbox({ src, alt }: { src: string; alt: string }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="relative block overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Image
          src={src}
          alt={alt}
          width={320}
          height={320}
          sizes="(min-width: 1024px) 320px, 75vw"
          className="h-auto max-h-[320px] w-auto max-w-[240px] object-cover"
          unoptimized
        />
      </button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-[92vw] border-none bg-background/95 p-2 sm:max-w-3xl">
          <DialogTitle className="sr-only">Imagem em tamanho maior</DialogTitle>
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={1200}
            sizes="90vw"
            className="h-auto max-h-[85vh] w-auto max-w-full rounded-md object-contain"
            unoptimized
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function StickerView({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt="Figurinha"
      width={120}
      height={120}
      className="h-auto w-auto max-w-[120px]"
      unoptimized
    />
  )
}

function DocumentoView({ src, nome }: { src: string; nome?: string }) {
  const ehPdf = src.toLowerCase().includes(".pdf")
  return (
    <div className="space-y-2">
      {ehPdf && (
        <object
          data={src}
          type="application/pdf"
          className="h-60 w-full max-w-[280px] rounded-md border"
        >
          <p className="p-2 text-xs text-muted-foreground">
            Não foi possível pré-visualizar. Use o link abaixo.
          </p>
        </object>
      )}
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-md bg-background/50 px-3 py-2 transition-colors hover:bg-background/80"
      >
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="max-w-[180px] truncate text-sm">{nome || "Documento"}</span>
        <Download className="ml-auto h-4 w-4 text-muted-foreground" />
      </a>
    </div>
  )
}

function MidiaPreview({ mensagem }: { mensagem: MensagemChat }) {
  const { tipo, mediaUrl, conteudo } = mensagem

  if (!mediaUrl) return null

  if (tipo === "imagem") {
    return <ImagemComLightbox src={mediaUrl} alt={extrairCaption(conteudo) || "Imagem do paciente"} />
  }

  if (tipo === "sticker") {
    return <StickerView src={mediaUrl} />
  }

  if (tipo === "video") {
    return <video src={mediaUrl} controls className="max-w-[240px] rounded-md" />
  }

  if (tipo === "documento") {
    const caption = extrairCaption(conteudo)
    return <DocumentoView src={mediaUrl} nome={caption || undefined} />
  }

  if (tipo === "audio") {
    const transcricao = extrairCaption(conteudo)
    return (
      <div className="space-y-2">
        <audio src={mediaUrl} controls className="max-w-[280px]" />
        {transcricao && (
          <p className="text-xs italic text-muted-foreground">{transcricao}</p>
        )}
      </div>
    )
  }

  return null
}


export function BolhaChat({ mensagem, onResponder, onScrollToReply }: BolhaChatProps) {
  const ehPaciente = mensagem.remetente === "paciente"
  const corClasse = CORES_REMETENTE[mensagem.remetente as keyof typeof CORES_REMETENTE] || CORES_REMETENTE.paciente
  const temMidia = !!(mensagem.mediaUrl && mensagem.tipo !== "texto")
  const ehSticker = mensagem.tipo === "sticker"
  const caption = extrairCaption(mensagem.conteudo)
  const mostrarLegenda =
    temMidia && mensagem.tipo !== "audio" && mensagem.tipo !== "sticker" && !!caption

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

      {/* Bolha — sticker não usa fundo de bolha (padrão WhatsApp) */}
      <div
        className={cn(
          "relative text-sm break-words",
          ehSticker ? "p-0" : "rounded-2xl px-3 py-2",
          !ehSticker && corClasse,
          !ehSticker && mensagem.replyTo && "rounded-tl-none"
        )}
      >
        {/* Mídia */}
        {temMidia && <MidiaPreview mensagem={mensagem} />}

        {/* Texto puro (só quando não é mídia) */}
        {!temMidia && mensagem.tipo === "texto" && (
          <p className="whitespace-pre-wrap">{linkify(mensagem.conteudo)}</p>
        )}

        {/* Legenda da mídia */}
        {mostrarLegenda && (
          <p className="mt-1 text-xs whitespace-pre-wrap italic text-muted-foreground">
            {caption}
          </p>
        )}

        {/* Timestamp */}
        <span
          className={cn(
            "block text-[10px] text-right mt-0.5",
            ehSticker ? "text-muted-foreground/80" : "text-muted-foreground/70"
          )}
        >
          {formatarData(mensagem.criadoEm, "HH:mm")}
        </span>

        {/* Botão reply (hover) */}
        {onResponder && !ehSticker && (
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
