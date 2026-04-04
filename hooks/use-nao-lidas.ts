"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"
import { useCallback } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useNaoLidas(): number {
  const { data, mutate } = useSWR("/api/atendimento/nao-lidas", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const recarregar = useCallback(() => { mutate() }, [mutate])
  useRealtimeTabela("mensagens", recarregar)

  return data?.total || 0
}
