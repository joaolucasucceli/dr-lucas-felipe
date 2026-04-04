"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, Square, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { uploadArquivo } from "@/lib/supabase-storage"
import { toast } from "sonner"

interface GravadorAudioProps {
  conversaId: string
  onEnviado: (url: string) => void
  onFechar: () => void
}

function obterMimeSuportado(): string {
  const opcoes = ["audio/webm", "audio/ogg", "audio/mp4"]
  for (const mime of opcoes) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  return "audio/webm"
}

export function GravadorAudio({ conversaId, onEnviado, onFechar }: GravadorAudioProps) {
  const [gravando, setGravando] = useState(false)
  const [duracao, setDuracao] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const limpar = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setDuracao(0)
    setGravando(false)
  }, [])

  useEffect(() => {
    return () => limpar()
  }, [limpar])

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = obterMimeSuportado()
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const ext = mimeType.split("/")[1] || "webm"
        const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mimeType })

        setEnviando(true)
        try {
          const { url } = await uploadArquivo(conversaId, file)
          onEnviado(url)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro ao enviar áudio")
        } finally {
          setEnviando(false)
          limpar()
        }
      }

      recorder.start(250)
      setGravando(true)

      // Timer
      const inicio = Date.now()
      timerRef.current = setInterval(() => {
        setDuracao(Math.floor((Date.now() - inicio) / 1000))
      }, 1000)
    } catch {
      toast.error("Não foi possível acessar o microfone")
    }
  }

  function pararGravacao() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }

  function cancelar() {
    limpar()
    onFechar()
  }

  const minutos = Math.floor(duracao / 60)
  const segundos = duracao % 60

  if (enviando) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-background">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Enviando áudio...</span>
      </div>
    )
  }

  if (!gravando) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-background">
        <Button size="sm" onClick={iniciarGravacao}>
          <Mic className="mr-1 h-3 w-3" />
          Gravar
        </Button>
        <Button variant="ghost" size="sm" onClick={onFechar}>
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 border rounded-lg bg-red-500/5 border-red-500/20">
      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-mono text-red-600 dark:text-red-400">
        {String(minutos).padStart(2, "0")}:{String(segundos).padStart(2, "0")}
      </span>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelar}>
        <X className="h-4 w-4" />
      </Button>
      <Button size="icon" className="h-7 w-7 bg-red-500 hover:bg-red-600" onClick={pararGravacao}>
        <Square className="h-3 w-3" />
      </Button>
    </div>
  )
}
