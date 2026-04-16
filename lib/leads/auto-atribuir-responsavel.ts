import { supabaseAdmin } from "@/lib/supabase"

export async function obterNovoResponsavelPorStatus(
  novoStatus: string
): Promise<string | null> {
  if (novoStatus === "verificacao_humana") {
    const { data: atendente } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("perfil", "atendente")
      .eq("tipo", "humano")
      .eq("ativo", true)
      .is("deletadoEm", null)
      .order("criadoEm", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!atendente) {
      console.warn("[auto-atribuir] Nenhuma atendente humana ativa encontrada — responsável não será trocado")
    }
    return atendente?.id ?? null
  }

  if (novoStatus === "consulta_realizada") {
    const { data: gestor } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("perfil", "gestor")
      .eq("ativo", true)
      .is("deletadoEm", null)
      .order("criadoEm", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!gestor) {
      console.warn("[auto-atribuir] Nenhum gestor ativo encontrado — responsável não será trocado")
    }
    return gestor?.id ?? null
  }

  return null
}
