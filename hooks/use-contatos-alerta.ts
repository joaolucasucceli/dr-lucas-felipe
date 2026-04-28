"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"

export interface ContatoAlerta {
  id: string
  nome: string
  statusFunil: string
  ultimaMovimentacaoEm: string | null
  atualizadoEm: string
  procedimentoInteresse: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useContatosAlerta() {
  const { data, error, isLoading, mutate } = useSWR<{ contatos: ContatoAlerta[]; total: number }>(
    "/api/dashboard/contatos-alerta",
    fetcher,
    { refreshInterval: 300000, revalidateOnFocus: false }
  )

  // Realtime: atualizar quando leads mudarem
  useRealtimeTabela("contatos", () => mutate())

  return {
    contatos: data?.contatos ?? [],
    total: data?.total ?? 0,
    carregando: isLoading,
    erro: error ? "Erro ao carregar contatos em alerta" : null,
  }
}
