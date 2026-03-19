"use client"

import { useState, useEffect, useCallback } from "react"

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
  ativo?: string
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
    if (params.ativo) searchParams.set("ativo", params.ativo)
    if (params.busca) searchParams.set("busca", params.busca)

    try {
      const res = await fetch(`/api/usuarios?${searchParams.toString()}`)
      if (!res.ok) {
        throw new Error("Erro ao carregar usuários")
      }
      const json = await res.json()
      setDados(json.dados)
      setTotal(json.total)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [params.pagina, params.porPagina, params.perfil, params.ativo, params.busca])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { dados, total, carregando, erro, recarregar: buscar }
}
