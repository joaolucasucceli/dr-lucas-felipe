"use client"

import { useCallback, useEffect, useState } from "react"
import { useRealtimeTabela } from "@/lib/realtime"

interface LeadAlerta {
  id: string
  nome: string
  statusFunil: string
  ultimaMovimentacaoEm: string | null
}

interface LeadNovoIA {
  id: string
  nome: string
  criadoEm: string
}

export interface DadosNotificacoes {
  leadsAlerta: LeadAlerta[]
  leadsNovosIA: LeadNovoIA[]
  total: number
}

const dadosVazios: DadosNotificacoes = {
  leadsAlerta: [],
  leadsNovosIA: [],
  total: 0,
}

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<DadosNotificacoes>(dadosVazios)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<Error | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch("/api/notificacoes")
      if (res.ok) {
        const data: DadosNotificacoes = await res.json()
        setNotificacoes(data)
        setErro(null)
      }
    } catch (e) {
      setErro(e instanceof Error ? e : new Error("Erro ao carregar notificações"))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscar()
    const interval = setInterval(buscar, 300000)
    return () => clearInterval(interval)
  }, [buscar])

  useRealtimeTabela("mensagens", buscar)
  useRealtimeTabela("contatos", buscar)

  return {
    notificacoes,
    total: notificacoes.total,
    carregando,
    erro,
  }
}
