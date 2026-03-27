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
