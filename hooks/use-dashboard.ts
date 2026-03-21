"use client"

import useSWR from "swr"

interface EtapaFunil {
  etapa: string
  label: string
  total: number
  cor: string
}

interface OrigemLead {
  origem: string
  total: number
}

export interface DashboardMetricas {
  totalLeads: number
  leadsNovosNoPeriodo: number
  taxaConversao: number
  agendamentosNoPeriodo: number
  agendamentosRealizados: number
  leadsPorEtapa: EtapaFunil[]
  leadsPorOrigem: OrigemLead[]
  mensagensEnviadasPelaIA: number
  followUpsEnviados: number
  confirmacaoEnviadas: number
  leadsEmAlerta: number
  leadsHoje: number
  agendamentosSemana: number
  periodo: string
  dataInicio: string | null
  dataFim: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useDashboard(periodo: string = "mes") {
  const { data, error, isLoading, mutate } = useSWR<DashboardMetricas>(
    `/api/dashboard/metricas?periodo=${periodo}`,
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  )

  return {
    metricas: data ?? null,
    carregando: isLoading,
    erro: error ? "Erro ao carregar métricas" : null,
    recarregar: () => mutate(),
  }
}
