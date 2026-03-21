"use client"

import { useState, useCallback } from "react"

interface AtividadeDia {
  data: string
  enviadas: number
  recebidas: number
}

interface DadosAnaJulia {
  periodo: { inicio: string; fim: string }
  mensagens: { total: number; enviadas: number; recebidas: number }
  conversas: { total: number; ativas: number; encerradas: number }
  funil: { leadsRecebidos: number; qualificados: number; agendados: number; realizados: number }
  followUps: { f1h: number; f6h: number; f24h: number }
  confirmacoes: { c6h: number; c3h: number; c30min: number }
  atividadePorDia: AtividadeDia[]
}

interface UseAnaJuliaParams {
  dataInicio: string
  dataFim: string
}

interface UseAnaJuliaReturn {
  dados: DadosAnaJulia | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useAnaJulia({ dataInicio, dataFim }: UseAnaJuliaParams): UseAnaJuliaReturn {
  const [dados, setDados] = useState<DadosAnaJulia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!dataInicio || !dataFim) return
    setCarregando(true)
    setErro(null)

    try {
      const params = new URLSearchParams({ dataInicio, dataFim })
      const res = await fetch(`/api/relatorios/ana-julia?${params.toString()}`)
      if (!res.ok) throw new Error("Erro ao carregar dados da Ana Júlia")
      const json = await res.json()
      setDados(json)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [dataInicio, dataFim])

  return { dados, carregando, erro, recarregar }
}
