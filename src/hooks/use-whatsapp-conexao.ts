"use client"

import { useEffect, useState } from "react"

/** Countdown de 120s enquanto qrcode visivel. Retorna segundos restantes
 *  (0 quando expira ou qrcode vazio). */
export function useQrCountdown(qrcode: string) {
  const [qrSegs, setQrSegs] = useState(0)

  useEffect(() => {
    // Todo setState sai por timer, nunca no corpo do effect: o React Compiler
    // trata setState síncrono em effect como render em cascata. Date.now()
    // também fica só aqui dentro — chamá-lo no render seria impureza.
    if (!qrcode) {
      const zerar = setTimeout(() => setQrSegs(0), 0)
      return () => clearTimeout(zerar)
    }

    const expiraEm = Date.now() + 120_000
    const atualizar = () =>
      setQrSegs(Math.max(0, Math.ceil((expiraEm - Date.now()) / 1000)))

    const inicial = setTimeout(atualizar, 0)
    const iv = setInterval(() => {
      atualizar()
      if (Date.now() >= expiraEm) clearInterval(iv)
    }, 1000)

    return () => {
      clearTimeout(inicial)
      clearInterval(iv)
    }
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
