"use client"

import { useState, useEffect, useCallback } from "react"
import { useRealtimeTabela } from "@/lib/realtime"

interface Lead {
  id: string
  nome: string
  whatsapp: string
  email: string | null
  procedimentoInteresse: string | null
  statusFunil: string
  origem: string | null
  arquivado: boolean
  criadoEm: string
  responsavel: { id: string; nome: string } | null
}

interface UseLeadsParams {
  pagina: number
  porPagina?: number
  statusFunil?: string
  busca?: string
  arquivado?: string
  filtroEspecial?: "alerta" | "followup"
}

interface UseLeadsReturn {
  dados: Lead[]
  total: number
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useLeads(params: UseLeadsParams): UseLeadsReturn {
  const [dados, setDados] = useState<Lead[]>([])
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
      if (params.statusFunil) searchParams.set("statusFunil", params.statusFunil)
      if (params.busca) searchParams.set("busca", params.busca)
      if (params.arquivado) searchParams.set("arquivado", params.arquivado)
      if (params.filtroEspecial === "alerta") searchParams.set("alerta", "true")
      if (params.filtroEspecial === "followup") searchParams.set("followup", "true")

      const res = await fetch(`/api/leads?${searchParams.toString()}`)

      if (!res.ok) {
        throw new Error("Erro ao carregar leads")
      }

      const json = await res.json()
      setDados(json.dados)
      setTotal(json.total)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [params.pagina, params.porPagina, params.statusFunil, params.busca, params.arquivado, params.filtroEspecial])

  useEffect(() => {
    buscar()
  }, [buscar])

  // Realtime: atualizar quando leads mudarem
  useRealtimeTabela("leads", buscar)

  return { dados, total, carregando, erro, recarregar: buscar }
}
