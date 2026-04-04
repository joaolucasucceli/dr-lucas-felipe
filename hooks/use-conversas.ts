"use client"

import useSWR from "swr"
import { useCallback } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface ConversaResumo {
  id: string
  leadId: string
  etapa: string
  modoConversa: string
  atendenteId: string | null
  atendente: { id: string; nome: string } | null
  ultimaMensagemEm: string | null
  lead: {
    id: string
    nome: string
    whatsapp: string
    statusFunil: string
    procedimentoInteresse: string | null
  }
  ultimaMensagem: {
    id: string
    conteudo: string
    remetente: string
    tipo: string
    criadoEm: string
  } | null
  naoLidas: number
}

interface UseConversasReturn {
  conversas: ConversaResumo[]
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useConversas(filtro?: string, busca?: string): UseConversasReturn {
  const params = new URLSearchParams()
  if (filtro) params.set("filtro", filtro)
  if (busca) params.set("busca", busca)

  const url = `/api/atendimento/conversas?${params.toString()}`

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })

  const recarregar = useCallback(() => { mutate() }, [mutate])

  return {
    conversas: data?.conversas || [],
    carregando: isLoading,
    erro: error ? "Erro ao carregar conversas" : null,
    recarregar,
  }
}
