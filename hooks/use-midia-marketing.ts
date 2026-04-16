"use client"

import { useState, useCallback, useEffect } from "react"

interface MidiaMarketing {
  id: string
  titulo: string
  descricao: string | null
  categoria: string
  procedimento: string | null
  url: string
  tipo: string
  ordem: number
  ativo: boolean
  criadoEm: string
}

interface Opcoes {
  busca?: string
  categoria?: string
}

export function useMidiaMarketing(opcoes: Opcoes = {}) {
  const [dados, setDados] = useState<MidiaMarketing[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const params = new URLSearchParams()
      if (opcoes.busca) params.set("busca", opcoes.busca)
      if (opcoes.categoria) params.set("categoria", opcoes.categoria)
      const res = await fetch(`/api/midia-marketing?${params}`)
      if (!res.ok) throw new Error("Erro ao buscar")
      const json = await res.json()
      setDados(json.dados || [])
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [opcoes.busca, opcoes.categoria])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, carregando, erro, recarregar: buscar }
}
