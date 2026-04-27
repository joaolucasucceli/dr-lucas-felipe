import { supabaseAdmin } from "@/lib/supabase"
import { criarId, agora } from "@/lib/db-utils"

/**
 * Retorna o ID do usuario "IA" (Ana Julia) usado como responsavel default
 * dos contatos criados pelo webhook. Se nao existir, cria. Se existir mas
 * estiver inativo/deletado, reativa.
 *
 * Idempotente — pode ser chamado quantas vezes for sem efeito colateral.
 * Sem cache: serverless nao persiste entre requests, e a query e barata
 * (1 linha, indice por tipo).
 */
export async function obterOuCriarUsuarioIA(): Promise<string | null> {
  // 1. Caminho feliz: ja existe ativo
  const { data: ativo } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("tipo", "ia")
    .eq("ativo", true)
    .is("deletadoEm", null)
    .maybeSingle()

  if (ativo?.id) return ativo.id

  // 2. Existe mas esta desativado/deletado — reativa
  const { data: existente } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("tipo", "ia")
    .limit(1)
    .maybeSingle()

  if (existente?.id) {
    await supabaseAdmin
      .from("usuarios")
      .update({
        ativo: true,
        deletadoEm: null,
        atualizadoEm: agora(),
      })
      .eq("id", existente.id)
    return existente.id
  }

  // 3. Nao existe — cria
  const { data: novo, error } = await supabaseAdmin
    .from("usuarios")
    .insert({
      id: criarId(),
      nome: "Ana Júlia",
      email: "ana.julia@drlucasfelipe.local",
      // Senha placeholder — usuario IA nao faz login.
      senha: "ia-no-login",
      tipo: "ia",
      perfil: "atendente",
      ativo: true,
      atualizadoEm: agora(),
    })
    .select("id")
    .single()

  if (error) {
    console.error("[obterOuCriarUsuarioIA] Falha ao criar usuario IA:", error.message)
    return null
  }

  return novo?.id ?? null
}
