"use client"

import { useState, useCallback } from "react"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

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

      const json = await fetchJson<DadosRelatorio>(
        `/api/relatorios/${tipo}?${params.toString()}`,
        undefined,
        { recurso: "Relatório", fallback: "Erro ao carregar relatório" }
      )
      setDados(json)
    } catch (e) {
      setErro(normalizarErroApi(e, "Erro ao carregar relatório").mensagem)
    } finally {
      setCarregando(false)
    }
  }, [tipo, dataInicio, dataFim, agrupar])

  return { dados, carregando, erro, recarregar }
}
