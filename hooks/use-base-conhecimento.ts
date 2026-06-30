"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

interface BaseConhecimento {
  id: string
  titulo: string
  conteudo: string
  criadoEm: string
  atualizadoEm: string
}

interface UseBaseConhecimentoParams {
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
      if (params.busca) searchParams.set("busca", params.busca)

      const json = await fetchJson<{ dados: BaseConhecimento[] }>(
        `/api/base-conhecimento?${searchParams.toString()}`,
        undefined,
        {
          recurso: "Base de conhecimento",
          fallback: "Erro ao carregar base de conhecimento",
        }
      )
      setDados(json.dados)
    } catch (e) {
      setErro(normalizarErroApi(e, "Erro ao carregar base de conhecimento").mensagem)
    } finally {
      setCarregando(false)
    }
  }, [params.busca])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, carregando, erro, recarregar: buscar }
}
