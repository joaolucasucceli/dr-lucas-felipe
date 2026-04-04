"use client"

import useSWR from "swr"
import { useCallback, useState } from "react"
import type { MensagemChat } from "@/components/features/chat/BolhaChat"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface UseMensagensReturn {
  mensagens: MensagemChat[]
  carregando: boolean
  erro: string | null
  recarregar: () => void
  adicionarMensagem: (msg: MensagemChat) => void
}

export function useMensagens(conversaId: string | null): UseMensagensReturn {
  const [otimistas, setOtimistas] = useState<MensagemChat[]>([])

  const { data, error, isLoading, mutate } = useSWR(
    conversaId ? `/api/atendimento/mensagens?conversaId=${conversaId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const adicionarMensagem = useCallback((msg: MensagemChat) => {
    setOtimistas((prev) => [...prev, msg])
    // Recarregar do servidor para sincronizar
    setTimeout(() => {
      mutate()
      setOtimistas([])
    }, 1000)
  }, [mutate])

  const recarregar = useCallback(() => {
    setOtimistas([])
    mutate()
  }, [mutate])

  const mensagensServidor: MensagemChat[] = data?.mensagens || []
  // Merge: servidor + otimistas que ainda não estão no servidor
  const idsServidor = new Set(mensagensServidor.map((m) => m.id))
  const otimistasNovos = otimistas.filter((m) => !idsServidor.has(m.id))

  return {
    mensagens: [...mensagensServidor, ...otimistasNovos],
    carregando: isLoading,
    erro: error ? "Erro ao carregar mensagens" : null,
    recarregar,
    adicionarMensagem,
  }
}
