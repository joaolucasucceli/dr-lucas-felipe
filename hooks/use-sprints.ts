"use client"

import { useState, useEffect, useCallback } from "react"

export interface SprintItem {
  id: string
  titulo: string
  concluido: boolean
  ordem: number
  criadoEm: string
}

export interface Sprint {
  id: string
  nome: string
  descricao: string | null
  status: "planejada" | "em_andamento" | "concluida"
  dataInicio: string | null
  dataFim: string | null
  ordem: number
  criadoEm: string
  atualizadoEm: string
  itens: SprintItem[]
  progresso: number
}

interface UseSprintsParams {
  status?: string
}

interface UseSprintsReturn {
  dados: Sprint[]
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useSprints(params: UseSprintsParams = {}): UseSprintsReturn {
  const [dados, setDados] = useState<Sprint[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const searchParams = new URLSearchParams()
      if (params.status) searchParams.set("status", params.status)

      const res = await fetch(`/api/sprints?${searchParams.toString()}`)

      if (!res.ok) {
        throw new Error("Erro ao carregar sprints")
      }

      const json = await res.json()
      setDados(json.dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [params.status])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, carregando, erro, recarregar: buscar }
}
