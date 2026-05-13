"use client"

import { useEffect, useRef, useState } from "react"

/** Countdown de 120s enquanto qrcode visivel. Retorna segundos restantes
 *  (0 quando expira ou qrcode vazio). */
export function useQrCountdown(qrcode: string) {
  const [qrSegs, setQrSegs] = useState(0)
  const qrExpiraRef = useRef<number | null>(null)

  useEffect(() => {
    if (!qrcode) {
      qrExpiraRef.current = null
      setQrSegs((s) => (s === 0 ? s : 0))
      return
    }
    qrExpiraRef.current = Date.now() + 120_000
    setQrSegs((s) => (s === 120 ? s : 120))
    const iv = setInterval(() => {
      const restante = Math.max(
        0,
        Math.ceil(((qrExpiraRef.current ?? 0) - Date.now()) / 1000)
      )
      setQrSegs(restante)
      if (restante === 0) clearInterval(iv)
    }, 1000)
    return () => clearInterval(iv)
  }, [qrcode])

  return qrSegs
}

/** Polling em /api/whatsapp/status a cada 5s enquanto aguardando.
 *  Chama onConnected() quando instancia fica ativa + connected. */
export function useWhatsappPolling(
  aguardando: boolean,
  onConnected: () => void
) {
  useEffect(() => {
    if (!aguardando) return
    const iv = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/status")
        const data = await res.json()
        if (data.ativo && data.status === "connected") {
          onConnected()
        }
      } catch {
        // polling transient — proxima tentativa em 5s
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [aguardando, onConnected])
}
