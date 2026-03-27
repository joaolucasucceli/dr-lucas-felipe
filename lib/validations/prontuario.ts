import { z } from "zod"

// ==========================================
// Anamnese
// ==========================================

export const atualizarAnamneseSchema = z.object({
  queixaPrincipal: z.string().optional(),
  historicoMedico: z.string().optional(),
  cirurgiasAnteriores: z.string().optional(),
  alergias: z.string().optional(),
  medicamentosEmUso: z.string().optional(),
  doencasPreExistentes: z.string().optional(),
  tabagismo: z.boolean().nullable().optional(),
  etilismo: z.boolean().nullable().optional(),
  atividadeFisica: z.string().optional(),
  gestacoes: z.string().optional(),
  anticoncepcional: z.string().optional(),
  pesoKg: z.number().positive("Peso deve ser positivo").nullable().optional(),
  alturaCm: z.number().positive("Altura deve ser positiva").nullable().optional(),
  pressaoArterial: z.string().optional(),
  observacoes: z.string().optional(),
})

export type AtualizarAnamneseInput = z.infer<typeof atualizarAnamneseSchema>

// ==========================================
// Evolução Clínica
// ==========================================

const tiposEvolucao = [
  "consulta",
  "procedimento",
  "retorno",
  "prescricao",
  "intercorrencia",
  "observacao",
] as const

export const criarEvolucaoSchema = z.object({
  tipo: z.enum(tiposEvolucao, { message: "Tipo de evolução inválido" }),
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  conteudo: z.string().min(5, "Conteúdo deve ter pelo menos 5 caracteres"),
  prescricao: z.string().optional(),
  orientacoes: z.string().optional(),
  procedimentoId: z.string().cuid().optional(),
  dataRegistro: z.string().datetime().optional(),
})

export const atualizarEvolucaoSchema = z.object({
  tipo: z.enum(tiposEvolucao).optional(),
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres").optional(),
  conteudo: z.string().min(5, "Conteúdo deve ter pelo menos 5 caracteres").optional(),
  prescricao: z.string().optional(),
  orientacoes: z.string().optional(),
  procedimentoId: z.string().cuid().nullable().optional(),
  dataRegistro: z.string().datetime().optional(),
})

export type CriarEvolucaoInput = z.infer<typeof criarEvolucaoSchema>
export type AtualizarEvolucaoInput = z.infer<typeof atualizarEvolucaoSchema>

// ==========================================
// Sinal Vital
// ==========================================

const tiposSinalVital = [
  "pressao_arterial",
  "frequencia_cardiaca",
  "temperatura",
  "saturacao_o2",
  "glicemia",
] as const

export const criarSinalVitalSchema = z.object({
  tipo: z.enum(tiposSinalVital, { message: "Tipo de sinal vital inválido" }),
  valor: z.string().min(1, "Valor é obrigatório"),
  unidade: z.string().min(1, "Unidade é obrigatória"),
  observacao: z.string().optional(),
  dataRegistro: z.string().datetime().optional(),
})

export type CriarSinalVitalInput = z.infer<typeof criarSinalVitalSchema>

// ==========================================
// Registro Cirúrgico
// ==========================================

const tiposAnestesia = [
  "local",
  "sedacao",
  "geral",
  "raquidiana",
  "peridural",
  "bloqueio_regional",
] as const

const marcoRecuperacaoSchema = z.object({
  descricao: z.string().min(2, "Descrição é obrigatória"),
  dataPrevista: z.string(),
  dataConcluida: z.string().nullable().optional(),
  concluido: z.boolean().default(false),
})

export const criarRegistroCirurgicoSchema = z.object({
  tipoAnestesia: z.enum(tiposAnestesia, { message: "Tipo de anestesia inválido" }),
  anestesista: z.string().optional(),
  tempoCircurgicoMinutos: z.number().int().positive("Tempo deve ser positivo"),
  sangramento: z.string().optional(),
  complicacoes: z.string().optional(),
  tecnicaUtilizada: z.string().min(5, "Técnica deve ter pelo menos 5 caracteres"),
  materiaisUtilizados: z.string().optional(),
  orientacoesPosOp: z.string().optional(),
  marcosRecuperacao: z.array(marcoRecuperacaoSchema).optional(),
})

export const atualizarRegistroCirurgicoSchema = criarRegistroCirurgicoSchema.partial()

export const atualizarMarcoSchema = z.object({
  indice: z.number().int().min(0),
  concluido: z.boolean(),
  dataConcluida: z.string().nullable().optional(),
})

export type CriarRegistroCirurgicoInput = z.infer<typeof criarRegistroCirurgicoSchema>
export type AtualizarRegistroCirurgicoInput = z.infer<typeof atualizarRegistroCirurgicoSchema>
export type MarcoRecuperacao = z.infer<typeof marcoRecuperacaoSchema>
