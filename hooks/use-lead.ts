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
  sobreOPaciente: string | null
  responsavelId: string | null
  arquivado: boolean
  arquivadoEm: string | null
  criadoEm: string
  atualizadoEm: string
  cicloAtual: number
  ciclosCompletos: number
  ehRetorno: boolean
  responsavel: { id: string; nome: string } | null
  agendamentos: Array<{
    id: string
    dataHora: string
    status: string
    observacao: string | null
    ciclo: number
    procedimento: { id: string; nome: string } | null
  }>
  conversas: Array<{
    id: string
    etapa: string
    ciclo: number
    mensagens: Array<{
      id: string
      tipo: string
      conteudo: string
      remetente: string
      criadoEm: string
    }>
  }>
  fotos: Array<{
    id: string
    url: string
    descricao: string | null
    tipoAnalise: string | null
    ciclo: number
    criadoEm: string
  }>
  paciente: { id: string; nome: string } | null
}

interface UseLeadReturn {
  lead: Lead | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useLead(id: string): UseLeadReturn {
  const [lead, setLead] = useState<Lead | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const res = await fetch(`/api/leads/${id}`)

      if (!res.ok) {
        throw new Error("Erro ao carregar lead")
      }

      const json = await res.json()
      setLead(json)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    buscar()
  }, [buscar])

  // Realtime: atualizar quando leads mudarem
  useRealtimeTabela("leads", buscar)

  return { lead, carregando, erro, recarregar: buscar }
}
