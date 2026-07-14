"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"
import { useCallback } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useNaoLidas(): number {
  // Sem refreshInterval — o realtime abaixo (subscribe em mensagens) ja
  // dispara recarregar() quando chega mensagem nova. Polling 30s era
  // 120 req/h por usuario em background, redundante.
  const { data, mutate } = useSWR("/api/atendimento/nao-lidas", fetcher, {
    revalidateOnFocus: false,
  })

  const recarregar = useCallback(() => { mutate() }, [mutate])
  useRealtimeTabela("mensagens", recarregar)

  return data?.total || 0
}
