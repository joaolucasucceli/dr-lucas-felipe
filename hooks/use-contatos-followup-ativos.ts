"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"

export interface ContatoFollowUpAtivo {
  id: string
  nome: string
  statusFunil: string
  procedimentoInteresse: string | null
  followUpEnviados: string[]
  ultimaMensagemEm: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useContatosFollowUpAtivos() {
  const { data, error, isLoading, mutate } = useSWR<{ contatos: ContatoFollowUpAtivo[]; total: number }>(
    "/api/dashboard/follow-ups-ativos",
    fetcher,
    { refreshInterval: 300000, revalidateOnFocus: false }
  )

  // Realtime: atualizar quando leads mudarem
  useRealtimeTabela("contatos", () => mutate())

  return {
    contatos: data?.contatos ?? [],
    total: data?.total ?? 0,
    carregando: isLoading,
    erro: error ? "Erro ao carregar follow-ups ativos" : null,
  }
}
