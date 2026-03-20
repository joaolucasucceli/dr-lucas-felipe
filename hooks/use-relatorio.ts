"use client"

import { useState, useCallback } from "react"

type TipoRelatorio = "funil" | "receita" | "atendimento"

interface UseRelatorioParams {
  tipo: TipoRelatorio
  dataInicio: string
  dataFim: string
  agrupar?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DadosRelatorio = Record<string, any>

interface UseRelatorioReturn {
  dados: DadosRelatorio | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useRelatorio({
  tipo,
  dataInicio,
  dataFim,
  agrupar,
}: UseRelatorioParams): UseRelatorioReturn {
  const [dados, setDados] = useState<DadosRelatorio | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!dataInicio || !dataFim) return
    setCarregando(true)
    setErro(null)

    try {
      const params = new URLSearchParams({ dataInicio, dataFim })
      if (agrupar) params.set("agrupar", agrupar)

      const res = await fetch(`/api/relatorios/${tipo}?${params.toString()}`)
      if (!res.ok) throw new Error("Erro ao carregar relatório")
      const json = await res.json()
      setDados(json)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [tipo, dataInicio, dataFim, agrupar])

  return { dados, carregando, erro, recarregar }
}

export function exportarRelatorio(
  tipo: "leads" | "agendamentos" | "conversas",
  dataInicio?: string,
  dataFim?: string
) {
  const params = new URLSearchParams({ tipo })
  if (dataInicio) params.set("dataInicio", dataInicio)
  if (dataFim) params.set("dataFim", dataFim)
  window.open(`/api/relatorios/exportar?${params.toString()}`, "_blank")
}
