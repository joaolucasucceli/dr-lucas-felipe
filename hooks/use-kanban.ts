"use client"

import useSWR from "swr"
import { toast } from "sonner"
import { useRealtimeTabela } from "@/lib/realtime"

export interface KanbanContato {
  id: string
  nome: string
  whatsapp: string
  procedimentoInteresse: string | null
  statusFunil: string
  criadoEm: string
  atualizadoEm: string
  ultimaMovimentacaoEm: string | null
  ehRetorno: boolean
  cicloAtual: number
  diasNaEtapa: number
  responsavel: { id: string; nome: string } | null
  modoConversa: "ia" | "humano" | null
  followUpEnviados: string[]
  iaPausada: boolean
}

interface UseKanbanParams {
  procedimentoInteresse?: string
}

interface KanbanData {
  colunas: Record<string, KanbanContato[]>
  total: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function buildUrl(params: UseKanbanParams) {
  const searchParams = new URLSearchParams()
  if (params.procedimentoInteresse) searchParams.set("procedimentoInteresse", params.procedimentoInteresse)
  const qs = searchParams.toString()
  return `/api/contatos/kanban${qs ? `?${qs}` : ""}`
}

export function useKanban(params: UseKanbanParams = {}) {
  const url = buildUrl(params)

  const { data, error, isLoading, mutate } = useSWR<KanbanData>(url, fetcher, {
    refreshInterval: 120000,
    revalidateOnFocus: false,
  })

  useRealtimeTabela("contatos", () => mutate())
  useRealtimeTabela("conversas", () => mutate())

  async function moverContato(
    contatoId: string,
    novoStatus: string
  ): Promise<boolean> {
    if (!data) return false

    let contatoOriginal: KanbanContato | null = null
    let colunaOriginal = ""

    for (const [etapa, leads] of Object.entries(data.colunas)) {
      const encontrado = leads.find((l) => l.id === contatoId)
      if (encontrado) {
        contatoOriginal = encontrado
        colunaOriginal = etapa
        break
      }
    }

    if (!contatoOriginal || colunaOriginal === novoStatus) return false

    const colunasOtimistas = { ...data.colunas }
    colunasOtimistas[colunaOriginal] = colunasOtimistas[colunaOriginal].filter(
      (l) => l.id !== contatoId
    )
    colunasOtimistas[novoStatus] = [
      { ...contatoOriginal, statusFunil: novoStatus, diasNaEtapa: 0 },
      ...colunasOtimistas[novoStatus],
    ]

    mutate({ colunas: colunasOtimistas, total: data.total }, false)

    try {
      const res = await fetch(`/api/contatos/${contatoId }/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusFunil: novoStatus }),
      })

      if (!res.ok) {
        const erro = await res.json()
        throw new Error(erro.error || "Erro ao mover contato")
      }

      mutate()
      return true
    } catch (err) {
      mutate(data, false)
      toast.error(err instanceof Error ? err.message : "Erro ao mover contato")
      return false
    }
  }

  return {
    colunas: data?.colunas ?? {},
    total: data?.total ?? 0,
    carregando: isLoading,
    erro: error ? "Erro ao carregar kanban" : null,
    recarregar: () => mutate(),
    moverContato,
  }
}
