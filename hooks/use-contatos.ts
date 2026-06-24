"use client"

import { useState, useEffect, useCallback } from "react"
import { useRealtimeTabela } from "@/lib/realtime"

export interface Contato {
  id: string
  tipo: "lead" | "paciente"
  nome: string
  whatsapp: string | null
  email: string | null
  procedimentoInteresse: string | null
  statusFunil: string | null
  origem: string | null
  cpf: string | null
  criadoEm: string
  promovidoEm: string | null
  responsavel: { id: string; nome: string } | null
  prontuario?: { id: string; numero: number } | null
}

interface UseContatosParams {
  pagina: number
  porPagina?: number
  tipo?: "lead" | "paciente" | "todos"
  statusFunil?: string
  busca?: string
  filtroEspecial?: "followup"
}

interface UseContatosReturn {
  dados: Contato[]
  total: number
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useContatos(params: UseContatosParams): UseContatosReturn {
  const [dados, setDados] = useState<Contato[]>([])
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
      if (params.tipo && params.tipo !== "todos") searchParams.set("tipo", params.tipo)
      if (params.statusFunil) searchParams.set("statusFunil", params.statusFunil)
      if (params.busca) searchParams.set("busca", params.busca)
      if (params.filtroEspecial === "followup") searchParams.set("followup", "true")

      const res = await fetch(`/api/contatos?${searchParams.toString()}`)

      if (!res.ok) {
        throw new Error("Erro ao carregar contatos")
      }

      const json = await res.json()
      setDados(json.dados)
      setTotal(json.total)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [params.pagina, params.porPagina, params.tipo, params.statusFunil, params.busca, params.filtroEspecial])

  useEffect(() => {
    buscar()
  }, [buscar])

  useRealtimeTabela("contatos", buscar)

  return { dados, total, carregando, erro, recarregar: buscar }
}
