"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"

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
  const carregouUmaVez = useRef(false)

  const buscar = useCallback(async () => {
    // Soh mostra skeleton no primeiro load. Refetches subsequentes rodam
    // em background sem desmontar a UI — evita que o FormAnamnese suma
    // durante digitacao (autosave chama onAtualizar a cada 800ms).
    if (!carregouUmaVez.current) {
      setCarregando(true)
    }
    setErro(null)

    try {
      const json = await fetchJson<Prontuario>(
        `/api/contatos/${pacienteId}/prontuario`,
        undefined,
        {
          recurso: "Prontuário",
          fallback: "Erro ao carregar prontuário",
          titulo404: "Prontuário não encontrado",
          mensagem404: "Esse prontuário pode ter sido removido ou ainda não foi criado.",
        }
      )
      setProntuario(json)
      carregouUmaVez.current = true
    } catch (e) {
      setErro(normalizarErroApi(e, "Erro ao carregar prontuário").mensagem)
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
