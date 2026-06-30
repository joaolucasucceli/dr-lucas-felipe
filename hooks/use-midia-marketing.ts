"use client"

import { useState, useCallback, useEffect } from "react"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

interface MidiaMarketing {
  id: string
  descricao: string
  url: string
  criadoEm: string
}

interface Opcoes {
  busca?: string
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
      const json = await fetchJson<{ dados: MidiaMarketing[] }>(
        `/api/midia-marketing?${params}`,
        undefined,
        { recurso: "Mídias", fallback: "Erro ao buscar mídias" }
      )
      setDados(json.dados || [])
    } catch (err) {
      setErro(normalizarErroApi(err, "Erro ao buscar mídias").mensagem)
    } finally {
      setCarregando(false)
    }
  }, [opcoes.busca])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, carregando, erro, recarregar: buscar }
}
