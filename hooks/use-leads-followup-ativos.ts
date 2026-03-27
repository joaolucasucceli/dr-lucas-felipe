"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"

export interface LeadFollowUpAtivo {
  id: string
  nome: string
  statusFunil: string
  procedimentoInteresse: string | null
  followUpEnviados: string[]
  ultimaMensagemEm: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useLeadsFollowUpAtivos() {
  const { data, error, isLoading, mutate } = useSWR<{ leads: LeadFollowUpAtivo[]; total: number }>(
    "/api/dashboard/follow-ups-ativos",
    fetcher,
    { refreshInterval: 300000, revalidateOnFocus: true }
  )

  // Realtime: atualizar quando leads mudarem
  useRealtimeTabela("leads", () => mutate())

  return {
    leads: data?.leads ?? [],
    total: data?.total ?? 0,
    carregando: isLoading,
    erro: error ? "Erro ao carregar follow-ups ativos" : null,
  }
}
