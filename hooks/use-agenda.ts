"use client"

import useSWR from "swr"
import { useRealtimeTabela } from "@/lib/realtime"

export interface AgendamentoAgenda {
  id: string
  dataHora: string
  duracao: number
  status: "agendado" | "confirmado" | "cancelado" | "realizado" | "remarcado"
  tipo: "diagnostico" | "consulta_online" | "consulta_presencial" | "procedimento" | "retorno" | "pos_operatorio"
  observacao: string | null
  googleEventUrl: string | null
  contatoId: string
  procedimentoId: string | null
  criadoEm: string
  contato: {
    id: string
    nome: string
    whatsapp: string
    tipo: "lead" | "paciente"
  } | null
  procedimento: {
    id: string
    nome: string
  } | null
}

interface RespostaAgenda {
  dados: AgendamentoAgenda[]
  periodo: { inicio: string; fim: string; tipo: string }
  total: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useAgenda(periodo: string = "semana") {
  const { data, error, isLoading, mutate } = useSWR<RespostaAgenda>(
    `/api/agenda?periodo=${periodo}`,
    fetcher,
    { refreshInterval: 300000, revalidateOnFocus: true }
  )

  useRealtimeTabela("agendamentos", () => mutate())
  useRealtimeTabela("contatos", () => mutate())

  return {
    agendamentos: data?.dados ?? [],
    total: data?.total ?? 0,
    periodo: data?.periodo,
    carregando: isLoading,
    erro: error ? "Erro ao carregar agenda" : null,
    recarregar: () => mutate(),
  }
}
