"use client"

import { useState, useEffect, useCallback } from "react"

interface BaseConhecimento {
  id: string
  titulo: string
  conteudo: string
  secao: string
  ordem: number
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

interface UseBaseConhecimentoParams {
  ativo?: string
  secao?: string
  busca?: string
}

interface UseBaseConhecimentoReturn {
  dados: BaseConhecimento[]
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useBaseConhecimento(
  params: UseBaseConhecimentoParams = {}
): UseBaseConhecimentoReturn {
  const [dados, setDados] = useState<BaseConhecimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const searchParams = new URLSearchParams()
      if (params.ativo) searchParams.set("ativo", params.ativo)
      if (params.secao) searchParams.set("secao", params.secao)
      if (params.busca) searchParams.set("busca", params.busca)

      const res = await fetch(`/api/base-conhecimento?${searchParams.toString()}`)

      if (!res.ok) {
        throw new Error("Erro ao carregar base de conhecimento")
      }

      const json = await res.json()
      setDados(json.dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [params.ativo, params.secao, params.busca])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, carregando, erro, recarregar: buscar }
}
