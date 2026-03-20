"use client"

import { useState, useEffect, useCallback } from "react"

interface Procedimento {
  id: string
  nome: string
  tipo: string
  descricao: string | null
  valorBase: number | null
  duracaoMin: number
  posOperatorio: string | null
  ativo: boolean
  criadoEm: string
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

      const res = await fetch(`/api/procedimentos?${searchParams.toString()}`)

      if (!res.ok) {
        throw new Error("Erro ao carregar procedimentos")
      }

      const json = await res.json()
      setDados(json.dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [params.ativo, params.busca])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, carregando, erro, recarregar: buscar }
}
