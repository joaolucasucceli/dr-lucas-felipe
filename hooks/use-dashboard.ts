"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

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

const fetcher = (url: string) =>
  fetchJson<DashboardMetricas>(url, undefined, {
    recurso: "Métricas",
    fallback: "Erro ao carregar métricas",
  })

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
    erro: error ? normalizarErroApi(error, "Erro ao carregar métricas").mensagem : null,
    recarregar: () => mutate(),
  }
}
