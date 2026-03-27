"use client"

import { useState, useRef, useCallback } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface FotoProntuario {
  id: string
  url: string
  descricao: string | null
  tipoFoto: string | null
  dataRegistro: string
}

interface ComparacaoFotosProps {
  fotos: FotoProntuario[]
  aberto: boolean
  onFechar: () => void
}

export function ComparacaoFotos({ fotos, aberto, onFechar }: ComparacaoFotosProps) {
  const [fotoAntesId, setFotoAntesId] = useState("")
  const [fotoDepoisId, setFotoDepoisId] = useState("")
  const [posicao, setPosicao] = useState(50)
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const arrastando = useRef(false)

  const fotosAntes = fotos.filter((f) => f.tipoFoto === "pre_operatorio")
  const fotosDepois = fotos.filter((f) => f.tipoFoto === "pos_operatorio")

  const fotoAntes = fotosAntes.find((f) => f.id === fotoAntesId)
  const fotoDepois = fotosDepois.find((f) => f.id === fotoDepoisId)

  const formatarLabel = (f: FotoProntuario) => {
    const data = format(new Date(f.dataRegistro), "dd/MM/yyyy", { locale: ptBR })
    return f.descricao ? `${data} — ${f.descricao}` : data
  }

  const handlePointerDown = useCallback(() => {
    arrastando.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    arrastando.current = false
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!arrastando.current) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setPosicao(pct)
    },
    []
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.max(0.5, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1))))
  }, [])

  function toggleFullscreen() {
    if (!containerRef.current) return
    if (!fullscreen) {
      containerRef.current.requestFullscreen?.()
      setFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setFullscreen(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Comparar Fotos</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Antes (Pré-operatório)</Label>
            <Select value={fotoAntesId} onValueChange={setFotoAntesId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {fotosAntes.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {formatarLabel(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Depois (Pós-operatório)</Label>
            <Select value={fotoDepoisId} onValueChange={setFotoDepoisId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {fotosDepois.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {formatarLabel(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {fotoAntes && fotoDepois ? (
          <div ref={containerRef} className="relative">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={toggleFullscreen}
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div
              className="relative w-full h-[400px] rounded-lg overflow-hidden cursor-col-resize select-none border"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerMove={handlePointerMove}
              onWheel={handleWheel}
            >
              {/* Imagem de fundo (Depois) */}
              <img
                src={fotoDepois.url}
                alt="Depois"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ transform: `scale(${zoom})` }}
                draggable={false}
              />

              {/* Imagem de frente (Antes) com clip */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - posicao}% 0 0)` }}
              >
                <img
                  src={fotoAntes.url}
                  alt="Antes"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ transform: `scale(${zoom})` }}
                  draggable={false}
                />
              </div>

              {/* Divisor */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                style={{ left: `${posicao}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" className="text-gray-600">
                    <path d="M5 3L2 8L5 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M11 3L14 8L11 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-3 left-3 z-10 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
                Antes
              </div>
              <div className="absolute top-3 right-3 z-10 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
                Depois
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Arraste o divisor para comparar. Use o scroll para zoom.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] rounded-lg border-2 border-dashed">
            <p className="text-sm text-muted-foreground">
              Selecione uma foto de antes e uma de depois para comparar.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
