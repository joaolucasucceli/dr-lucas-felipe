"use client"

import useSWR from "swr"

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
  const { data, error, isLoading } = useSWR<{ leads: LeadAlerta[] }>(
    "/api/dashboard/leads-alerta",
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  )

  return {
    leads: data?.leads ?? [],
    carregando: isLoading,
    erro: error ? "Erro ao carregar leads em alerta" : null,
  }
}
