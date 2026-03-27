"use client"

import useSWR from "swr"
import { toast } from "sonner"
import { useRealtimeTabela } from "@/lib/realtime"

export interface KanbanLead {
  id: string
  nome: string
  whatsapp: string
  procedimentoInteresse: string | null
  statusFunil: string
  criadoEm: string
  atualizadoEm: string
  ultimaMovimentacaoEm: string | null
  motivoPerda: string | null
  ehRetorno: boolean
  cicloAtual: number
  diasNaEtapa: number
  responsavel: { id: string; nome: string } | null
  followUpEnviados: string[]
}

interface UseKanbanParams {
  responsavelId?: string
  procedimentoInteresse?: string
}

interface KanbanData {
  colunas: Record<string, KanbanLead[]>
  total: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function buildUrl(params: UseKanbanParams) {
  const searchParams = new URLSearchParams()
  if (params.responsavelId) searchParams.set("responsavelId", params.responsavelId)
  if (params.procedimentoInteresse) searchParams.set("procedimentoInteresse", params.procedimentoInteresse)
  const qs = searchParams.toString()
  return `/api/leads/kanban${qs ? `?${qs}` : ""}`
}

export function useKanban(params: UseKanbanParams = {}) {
  const url = buildUrl(params)

  const { data, error, isLoading, mutate } = useSWR<KanbanData>(url, fetcher, {
    refreshInterval: 120000,
    revalidateOnFocus: true,
  })

  // Realtime: atualizar quando leads ou conversas mudarem
  useRealtimeTabela("leads", () => mutate())
  useRealtimeTabela("conversas", () => mutate())

  async function moverLead(
    leadId: string,
    novoStatus: string,
    motivoPerda?: string
  ): Promise<boolean> {
    if (!data) return false

    // Encontrar o lead e sua coluna atual
    let leadOriginal: KanbanLead | null = null
    let colunaOriginal = ""

    for (const [etapa, leads] of Object.entries(data.colunas)) {
      const encontrado = leads.find((l) => l.id === leadId)
      if (encontrado) {
        leadOriginal = encontrado
        colunaOriginal = etapa
        break
      }
    }

    if (!leadOriginal || colunaOriginal === novoStatus) return false

    // Atualização otimista
    const colunasOtimistas = { ...data.colunas }
    colunasOtimistas[colunaOriginal] = colunasOtimistas[colunaOriginal].filter(
      (l) => l.id !== leadId
    )
    colunasOtimistas[novoStatus] = [
      { ...leadOriginal, statusFunil: novoStatus, diasNaEtapa: 0 },
      ...colunasOtimistas[novoStatus],
    ]

    mutate({ colunas: colunasOtimistas, total: data.total }, false)

    try {
      const body: Record<string, string> = { statusFunil: novoStatus }
      if (motivoPerda) body.motivoPerda = motivoPerda

      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const erro = await res.json()
        throw new Error(erro.error || "Erro ao mover lead")
      }

      mutate()
      return true
    } catch (err) {
      // Reverter
      mutate(data, false)
      toast.error(err instanceof Error ? err.message : "Erro ao mover lead")
      return false
    }
  }

  return {
    colunas: data?.colunas ?? {},
    total: data?.total ?? 0,
    carregando: isLoading,
    erro: error ? "Erro ao carregar kanban" : null,
    recarregar: () => mutate(),
    moverLead,
  }
}
