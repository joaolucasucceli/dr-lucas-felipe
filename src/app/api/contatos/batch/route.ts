import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import {
  limparDependenciasDoContato,
  anonimizarWhatsapp,
} from "@/lib/contatos/limpar-dependencias"
import { agora } from "@/lib/db-utils"
import { registrarAuditLog } from "@/lib/audit"

const schema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  acao: z.string(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { ids, acao } = parsed.data

  if (acao !== "excluir") {
    return NextResponse.json(
      { error: "Essa operação foi descontinuada. Use exclusão quando necessário." },
      { status: 410 }
    )
  }

  const authGestor = await requireRole("gestor")
  if (authGestor.error) return authGestor.error

  const { data: contatos } = await supabaseAdmin
    .from("contatos")
    .select("id, tipo, nome, whatsapp")
    .in("id", ids)
    .is("deletadoEm", null)

  let sucesso = 0
  const falhas: string[] = []

  for (const contato of contatos ?? []) {
    const chatId = contato.whatsapp ? `${contato.whatsapp}@s.whatsapp.net` : null
    try {
      await limparDependenciasDoContato({ contatoId: contato.id, chatId })
      const whatsappAnonimo = contato.whatsapp
        ? anonimizarWhatsapp(contato.whatsapp, contato.id)
        : null
      const deletadoEm = agora()
      const { error } = await supabaseAdmin
        .from("contatos")
        .update({
          deletadoEm,
          atualizadoEm: deletadoEm,
          ...(whatsappAnonimo ? { whatsapp: whatsappAnonimo } : {}),
        })
        .eq("id", contato.id)
      if (error) throw error

      if (contato.whatsapp) {
        const { data: ativoComMesmoWhatsapp, error: verificacaoError } = await supabaseAdmin
          .from("contatos")
          .select("id")
          .eq("whatsapp", contato.whatsapp)
          .is("deletadoEm", null)
          .maybeSingle()

        if (verificacaoError) throw verificacaoError
        if (ativoComMesmoWhatsapp) {
          throw new Error(
            `WhatsApp ${contato.whatsapp} ainda ativo no contato ${ativoComMesmoWhatsapp.id}`
          )
        }
      }

      await registrarAuditLog({
        usuarioId: authGestor.session.user.id,
        acao: "excluir",
        entidade: "Contato",
        entidadeId: contato.id,
        dadosAntes: contato as unknown as Record<string, unknown>,
        dadosDepois: {
          deletadoEm,
          whatsappAnonimizado: Boolean(whatsappAnonimo),
        },
      })

      sucesso++
    } catch (err) {
      console.error(`[contatos/batch excluir] ${contato.id}:`, err)
      falhas.push(contato.id)
    }
  }

  return NextResponse.json({ sucesso, falhas, total: ids.length })
}
