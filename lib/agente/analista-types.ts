import type { StatusFunil } from "@/lib/types/enums"

export interface QualificacaoComercial {
  orcamento: string | null
  timing: string | null
  decisor: string | null
  contraindicacao: string | null
  score: number
}

export interface AgendamentoDetectado {
  dataIso: string | null
  hora: string | null
  confianca: number
}

export interface AnalistaOutput {
  nome: string | null
  procedimentoInteresse: string | null
  qualificacaoComercial: QualificacaoComercial
  sobreOPacienteAdicionar: string | null
  etapaCorreta: StatusFunil | "manter"
  agendamentoDetectado: AgendamentoDetectado | null
  justificativa: string
  confiancaGeral: number
}

export interface EstadoAtualContato {
  nome: string
  statusFunil: StatusFunil | null
  procedimentoInteresse: string | null
  sobreOPaciente: string | null
}

export interface Divergencia {
  campo: string
  atual: unknown
  proposto: unknown
}

export interface MensagemHistorico {
  remetente: "paciente" | "agente" | "atendente"
  conteudo: string
  criadoEm: string
}

export interface AnalistaLogRow {
  id: string
  contatoId: string
  conversaId: string | null
  historicoMensagens: MensagemHistorico[]
  estadoAtualLead: EstadoAtualContato
  output: AnalistaOutput | null
  divergencias: Divergencia[]
  aplicado: boolean
  confiancaGeral: number | null
  erro: string | null
  criadoEm: string
}
