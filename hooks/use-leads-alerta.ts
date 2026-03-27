"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"

export interface LeadAlerta {
  id: string
  nome: string
  statusFunil: string
  ultimaMovimentacaoEm: string | null
  atualizadoEm: string
  procedimentoInteresse: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useLeadsAlerta() {
  const { data, error, isLoading, mutate } = useSWR<{ leads: LeadAlerta[]; total: number }>(
    "/api/dashboard/leads-alerta",
    fetcher,
    { refreshInterval: 300000, revalidateOnFocus: true }
  )

  // Realtime: atualizar quando leads mudarem
  useRealtimeTabela("leads", () => mutate())

  return {
    leads: data?.leads ?? [],
    total: data?.total ?? 0,
    carregando: isLoading,
    erro: error ? "Erro ao carregar leads em alerta" : null,
  }
}
