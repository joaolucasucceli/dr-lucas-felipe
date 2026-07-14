"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

interface Procedimento {
  id: string
  nome: string
  tipo: string
  descricao: string | null
  duracaoMin: number
  posOperatorio: string | null
  ativo: boolean
  criadoEm: string
  valorBaseMinBrl: number | null
  valorBaseMaxBrl: number | null
  valorEstimadoBrl: number | null
  valorCheioBrl: number | null
  parcelamento: string | null
  escopoOferta: string | null
}

interface UseProcedimentosParams {
  ativo?: string
  busca?: string
}

interface UseProcedimentosReturn {
  dados: Procedimento[]
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useProcedimentos(params: UseProcedimentosParams = {}): UseProcedimentosReturn {
  const [dados, setDados] = useState<Procedimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const searchParams = new URLSearchParams()
      if (params.ativo) searchParams.set("ativo", params.ativo)
      if (params.busca) searchParams.set("busca", params.busca)

      const json = await fetchJson<{ dados: Procedimento[] }>(
        `/api/procedimentos?${searchParams.toString()}`,
        undefined,
        { recurso: "Procedimentos", fallback: "Erro ao carregar procedimentos" }
      )
      setDados(json.dados)
    } catch (e) {
      setErro(normalizarErroApi(e, "Erro ao carregar procedimentos").mensagem)
    } finally {
      setCarregando(false)
    }
  }, [params.ativo, params.busca])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, carregando, erro, recarregar: buscar }
}
