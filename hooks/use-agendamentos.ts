"use client"

import { useState, useEffect, useCallback } from "react"
import { useRealtimeTabela } from "@/lib/realtime"

export interface Agendamento {
  id: string
  leadId: string
  procedimentoId: string | null
  dataHora: string
  status: string
  duracao: number
  observacao: string | null
  googleEventId: string | null
  googleEventUrl: string | null
  ciclo: number
  sincronizado: boolean
  criadoEm: string
  atualizadoEm: string
  lead: { nome: string; whatsapp: string }
  procedimento: { nome: string } | null
}

interface UseAgendamentosParams {
  leadId?: string
  status?: string
  dataInicio?: string
  dataFim?: string
  pagina?: number
  porPagina?: number
}

export function useAgendamentos(params?: UseAgendamentosParams) {
  const [dados, setDados] = useState<Agendamento[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const query = new URLSearchParams()
      if (params?.leadId) query.set("leadId", params.leadId)
      if (params?.status) query.set("status", params.status)
      if (params?.dataInicio) query.set("dataInicio", params.dataInicio)
      if (params?.dataFim) query.set("dataFim", params.dataFim)
      if (params?.pagina) query.set("pagina", String(params.pagina))
      if (params?.porPagina) query.set("porPagina", String(params.porPagina))

      const res = await fetch(`/api/agendamentos?${query.toString()}`)
      if (!res.ok) throw new Error("Erro ao buscar agendamentos")

      const json = await res.json()
      setDados(json.dados)
      setTotal(json.total)
      setTotalPaginas(json.totalPaginas)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [
    params?.leadId,
    params?.status,
    params?.dataInicio,
    params?.dataFim,
    params?.pagina,
    params?.porPagina,
  ])

  useEffect(() => {
    buscar()
  }, [buscar])

  // Realtime: atualizar quando agendamentos mudarem
  useRealtimeTabela("agendamentos", buscar)

  return { dados, total, totalPaginas, carregando, erro, recarregar: buscar }
}
