"use client"

import { useState, useEffect, useCallback } from "react"
import { useRealtimeTabela } from "@/lib/realtime"

export interface ContatoDetalhado {
  id: string
  tipo: "lead" | "paciente"
  nome: string
  whatsapp: string | null
  email: string | null
  procedimentoInteresse: string | null
  statusFunil: string | null
  origem: string | null
  sobreOPaciente: string | null
  responsavelId: string | null
  arquivado: boolean
  arquivadoEm: string | null
  criadoEm: string
  atualizadoEm: string
  promovidoEm: string | null
  cicloAtual: number
  ciclosCompletos: number
  ehRetorno: boolean
  cpf: string | null
  dataNascimento: string | null
  sexo: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  contatoEmergencia: string | null
  contatoEmergenciaTel: string | null
  consentimentoLgpd: boolean
  consentimentoLgpdEm: string | null
  responsavel: { id: string; nome: string } | null
  agendamentos: Array<{
    id: string
    dataHora: string
    status: string
    tipo: string
    duracao: number | null
    observacao: string | null
    googleEventUrl: string | null
    criadoEm: string
    realizadoEm: string | null
    realizadoPor: string | null
    procedimento: { id: string; nome: string } | null
  }>
  conversas: Array<{
    id: string
    etapa: string
    ciclo: number
    modoConversa: "ia" | "humano"
    mensagens: Array<{
      id: string
      tipo: string
      conteudo: string
      remetente: string
      mediaUrl: string | null
      mediaType: string | null
      replyToId: string | null
      criadoEm: string
      replyTo: {
        id: string
        conteudo: string
        remetente: string
      } | null
    }>
  }>
  fotos: Array<{
    id: string
    url: string
    descricao: string | null
    categoria: string
    tipoAnalise: string | null
    ciclo: number | null
    criadoEm: string
  }>
  prontuario: {
    id: string
    numero: number
    anamnese: Record<string, unknown> | null
    _count?: {
      evolucoes: number
      documentos: number
      fotos: number
    }
  } | null
}

interface UseContatoReturn {
  contato: ContatoDetalhado | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useContato(id: string): UseContatoReturn {
  const [contato, setContato] = useState<ContatoDetalhado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const res = await fetch(`/api/contatos/${id}`)

      if (!res.ok) {
        throw new Error("Erro ao carregar contato")
      }

      const json = await res.json()
      setContato(json)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    buscar()
  }, [buscar])

  useRealtimeTabela("contatos", buscar)

  return { contato, carregando, erro, recarregar: buscar }
}
