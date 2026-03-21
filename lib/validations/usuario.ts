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
  ativo: z.boolean().optional(),
})

export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>
export type AtualizarUsuarioInput = z.infer<typeof atualizarUsuarioSchema>
