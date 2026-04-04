"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface ReprodutorAudioProps {
  src: string
  transcricao?: string
}

function formatarTempo(segs: number): string {
  const m = Math.floor(segs / 60)
  const s = Math.floor(segs % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export function ReprodutorAudio({ src, transcricao }: ReprodutorAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tocando, setTocando] = useState(false)
  const [duracao, setDuracao] = useState(0)
  const [posicao, setPosicao] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    function handleLoadedMetadata() {
      setDuracao(audio!.duration || 0)
    }
    function handleTimeUpdate() {
      setPosicao(audio!.currentTime)
    }
    function handleEnded() {
      setTocando(false)
      setPosicao(0)
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [])

  function togglePlay() {
    if (!audioRef.current) return
    if (tocando) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setTocando(!tocando)
  }

  function handleSeek(valor: number[]) {
    if (!audioRef.current) return
    audioRef.current.currentTime = valor[0]
    setPosicao(valor[0])
  }

  return (
    <div className="space-y-1 min-w-[180px]">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={togglePlay}
        >
          {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Slider
          value={[posicao]}
          max={duracao || 1}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1"
        />

        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">
          {formatarTempo(tocando ? posicao : duracao)}
        </span>
      </div>

      {transcricao && transcricao !== "[audio]" && (
        <p className="text-xs text-muted-foreground italic pl-10">{transcricao}</p>
      )}

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  )
}
