"use client"

import useSWR from "swr"

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
  const { data, error, isLoading } = useSWR<{ leads: LeadFollowUpAtivo[] }>(
    "/api/dashboard/follow-ups-ativos",
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  )

  return {
    leads: data?.leads ?? [],
    carregando: isLoading,
    erro: error ? "Erro ao carregar follow-ups ativos" : null,
  }
}
