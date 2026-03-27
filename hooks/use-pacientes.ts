"use client"

import { useState, useEffect, useCallback } from "react"
import { useRealtimeTabela } from "@/lib/realtime"

interface Paciente {
  id: string
  nome: string
  whatsapp: string | null
  cpf: string | null
  email: string | null
  ativo: boolean
  criadoEm: string
  leadOrigemId: string | null
}

interface UsePacientesParams {
  pagina: number
  porPagina?: number
  busca?: string
  ativo?: string
}

interface UsePacientesReturn {
  dados: Paciente[]
  total: number
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function usePacientes(params: UsePacientesParams): UsePacientesReturn {
  const [dados, setDados] = useState<Paciente[]>([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const searchParams = new URLSearchParams()
      searchParams.set("pagina", String(params.pagina))
      searchParams.set("porPagina", String(params.porPagina || 10))
      if (params.busca) searchParams.set("busca", params.busca)
      if (params.ativo) searchParams.set("ativo", params.ativo)

      const res = await fetch(`/api/pacientes?${searchParams.toString()}`)

      if (!res.ok) {
        if (res.status === 403) throw new Error("Acesso negado")
        throw new Error("Erro ao carregar pacientes")
      }

      const json = await res.json()
      setDados(json.dados)
      setTotal(json.total)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [params.pagina, params.porPagina, params.busca, params.ativo])

  useEffect(() => {
    buscar()
  }, [buscar])

  // Realtime: atualizar quando pacientes mudarem
  useRealtimeTabela("pacientes", buscar)

  return { dados, total, carregando, erro, recarregar: buscar }
}
