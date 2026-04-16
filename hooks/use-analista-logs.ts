"use client"

import useSWR from "swr"
import type {
  AnalistaOutput,
  Divergencia,
  EstadoAtualLead,
  MensagemHistorico,
} from "@/lib/agente/analista-types"

export interface AnalistaLogComLead {
  id: string
  leadId: string
  conversaId: string | null
  historicoMensagens: MensagemHistorico[]
  estadoAtualLead: EstadoAtualLead
  output: AnalistaOutput | null
  divergencias: Divergencia[]
  aplicado: boolean
  confiancaGeral: number | null
  erro: string | null
  criadoEm: string
  leads: { nome: string; whatsapp: string }
}

interface Resposta {
  logs: AnalistaLogComLead[]
  total: number
}

async function fetcher(url: string): Promise<Resposta> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Erro ao buscar logs")
  return res.json()
}

export function useAnalistaLogs(opcoes: { apenasDivergentes?: boolean } = {}) {
  const params = new URLSearchParams()
  if (opcoes.apenasDivergentes) params.set("apenasDivergentes", "true")

  const { data, error, isLoading, mutate } = useSWR<Resposta>(
    `/api/analista-logs?${params.toString()}`,
    fetcher,
    { refreshInterval: 10_000 }
  )

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    carregando: isLoading,
    erro: error ? "Erro ao carregar logs" : null,
    recarregar: mutate,
  }
}
