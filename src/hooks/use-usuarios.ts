"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string
  tipo: string
  ativo: boolean
  criadoEm: string
}

interface UseUsuariosParams {
  pagina: number
  porPagina: number
  perfil?: string
  busca?: string
}

interface UseUsuariosReturn {
  dados: Usuario[]
  total: number
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useUsuarios(params: UseUsuariosParams): UseUsuariosReturn {
  const [dados, setDados] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    const searchParams = new URLSearchParams()
    searchParams.set("pagina", String(params.pagina))
    searchParams.set("porPagina", String(params.porPagina))
    if (params.perfil) searchParams.set("perfil", params.perfil)
    if (params.busca) searchParams.set("busca", params.busca)

    try {
      const json = await fetchJson<{ dados: Usuario[]; total: number }>(
        `/api/usuarios?${searchParams.toString()}`,
        undefined,
        { recurso: "Usuários", fallback: "Erro ao carregar usuários" }
      )
      setDados(json.dados)
      setTotal(json.total)
    } catch (e) {
      setErro(normalizarErroApi(e, "Erro ao carregar usuários").mensagem)
    } finally {
      setCarregando(false)
    }
  }, [params.pagina, params.porPagina, params.perfil, params.busca])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, total, carregando, erro, recarregar: buscar }
}
