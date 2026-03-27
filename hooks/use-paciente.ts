"use client"

import { useState, useEffect, useCallback } from "react"
import { useRealtimeTabela } from "@/lib/realtime"

interface Paciente {
  id: string
  nome: string
  whatsapp: string | null
  email: string | null
  cpf: string | null
  dataNascimento: string | null
  sexo: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  contatoEmergencia: string | null
  contatoEmergenciaTel: string | null
  observacoes: string | null
  consentimentoLgpd: boolean
  consentimentoLgpdEm: string | null
  leadOrigemId: string | null
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
  prontuario: {
    id: string
    numero: number
    anamnese: Record<string, unknown> | null
    _count: {
      evolucoes: number
      documentos: number
      fotos: number
    }
  } | null
  agendamentos: Array<{
    id: string
    dataHora: string
    status: string
    tipo: string | null
    observacao: string | null
    procedimento: { id: string; nome: string } | null
  }>
  leadOrigem: {
    id: string
    nome: string
    whatsapp: string
  } | null
}

interface UsePacienteReturn {
  paciente: Paciente | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function usePaciente(id: string): UsePacienteReturn {
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const res = await fetch(`/api/pacientes/${id}`)

      if (!res.ok) {
        if (res.status === 403) throw new Error("Acesso negado")
        throw new Error("Erro ao carregar paciente")
      }

      const json = await res.json()
      setPaciente(json)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    buscar()
  }, [buscar])

  // Realtime: atualizar quando pacientes mudarem
  useRealtimeTabela("pacientes", buscar)

  return { paciente, carregando, erro, recarregar: buscar }
}
