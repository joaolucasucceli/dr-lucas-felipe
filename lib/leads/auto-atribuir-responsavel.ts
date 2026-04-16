import { prisma } from "@/lib/prisma"

/**
 * Retorna o ID do usuário que deve ser atribuído como responsável
 * quando o lead transita para um determinado status. Null se a transição
 * não exige troca automática.
 *
 * Regras:
 * - verificacao_humana → atendente humana ativa (IA passa o bastão)
 * - consulta_realizada → gestor ativo (Dr. Lucas assume)
 */
export async function obterNovoResponsavelPorStatus(
  novoStatus: string
): Promise<string | null> {
  if (novoStatus === "verificacao_humana") {
    const atendente = await prisma.usuario.findFirst({
      where: {
        perfil: "atendente",
        tipo: "humano",
        ativo: true,
        deletadoEm: null,
      },
      orderBy: { criadoEm: "asc" },
      select: { id: true },
    })
    if (!atendente) {
      console.warn("[auto-atribuir] Nenhuma atendente humana ativa encontrada — responsável não será trocado")
    }
    return atendente?.id ?? null
  }

  if (novoStatus === "consulta_realizada") {
    const gestor = await prisma.usuario.findFirst({
      where: {
        perfil: "gestor",
        ativo: true,
        deletadoEm: null,
      },
      orderBy: { criadoEm: "asc" },
      select: { id: true },
    })
    if (!gestor) {
      console.warn("[auto-atribuir] Nenhum gestor ativo encontrado — responsável não será trocado")
    }
    return gestor?.id ?? null
  }

  return null
}
