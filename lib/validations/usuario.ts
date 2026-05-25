import { z } from "zod"

export const criarUsuarioSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  perfil: z.enum(["gestor", "atendente"]),
  tipo: z.enum(["humano", "ia"]).default("humano"),
})

export const atualizarUsuarioSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  perfil: z.enum(["gestor", "atendente"]).optional(),
  // JLU-170 v2 (B 25/05): flag pra exigir pre-aprovacao de agendamento.
  // Quando true, Ana Julia chama solicitar_aprovacao_horario em vez de
  // registrar_agendamento direto.
  exigirAprovacaoAgendamento: z.boolean().optional(),
})

export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>
export type AtualizarUsuarioInput = z.infer<typeof atualizarUsuarioSchema>
