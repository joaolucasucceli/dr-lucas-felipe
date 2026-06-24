"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"

interface EtapaFunil {
  etapa: string
  label: string
  total: number
  cor: string
}

export interface DashboardMetricas {
  totalLeads: number
  leadsPorEtapa: EtapaFunil[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardMetricas>(
    "/api/dashboard/metricas",
    fetcher,
    { refreshInterval: 300000, revalidateOnFocus: false }
  )

  // Realtime: atualizar métricas quando leads mudarem de volume ou etapa.
  useRealtimeTabela("contatos", () => mutate())

  return {
    metricas: data ?? null,
    carregando: isLoading,
    erro: error ? "Erro ao carregar métricas" : null,
    recarregar: () => mutate(),
  }
}
