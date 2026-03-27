"use client"

import { useState, useEffect, useCallback } from "react"

interface Anamnese {
  id: string
  queixaPrincipal: string | null
  historicoMedico: string | null
  cirurgiasAnteriores: string | null
  alergias: string | null
  medicamentosEmUso: string | null
  doencasPreExistentes: string | null
  tabagismo: boolean | null
  etilismo: boolean | null
  atividadeFisica: string | null
  gestacoes: string | null
  anticoncepcional: string | null
  pesoKg: number | null
  alturaCm: number | null
  imc: number | null
  pressaoArterial: string | null
  observacoes: string | null
  criadoEm: string
  atualizadoEm: string
}

interface MarcoRecuperacao {
  descricao: string
  dataPrevista: string
  dataConcluida?: string | null
  concluido: boolean
}

interface RegistroCirurgico {
  id: string
  evolucaoId: string
  tipoAnestesia: string
  anestesista: string | null
  tempoCircurgicoMinutos: number
  sangramento: string | null
  complicacoes: string | null
  tecnicaUtilizada: string
  materiaisUtilizados: string | null
  orientacoesPosOp: string | null
  marcosRecuperacao: MarcoRecuperacao[] | null
  criadoEm: string
  atualizadoEm: string
}

interface Evolucao {
  id: string
  tipo: string
  dataRegistro: string
  titulo: string
  conteudo: string
  prescricao: string | null
  orientacoes: string | null
  procedimentoId: string | null
  criadoEm: string
  atualizadoEm: string
  procedimento: { id: string; nome: string } | null
  registroCirurgico?: RegistroCirurgico | null
}

interface Prontuario {
  id: string
  pacienteId: string
  numero: number
  criadoEm: string
  atualizadoEm: string
  anamnese: Anamnese | null
  evolucoes: Evolucao[]
  _count: {
    documentos: number
    fotos: number
  }
}

interface UseProntuarioReturn {
  prontuario: Prontuario | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useProntuario(pacienteId: string): UseProntuarioReturn {
  const [prontuario, setProntuario] = useState<Prontuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/prontuario`)

      if (!res.ok) {
        throw new Error("Erro ao carregar prontuário")
      }

      const json = await res.json()
      setProntuario(json)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [pacienteId])

  useEffect(() => {
    buscar()
  }, [buscar])

  return { prontuario, carregando, erro, recarregar: buscar }
}

export type { Prontuario, Anamnese, Evolucao, RegistroCirurgico, MarcoRecuperacao }
