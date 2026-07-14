import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase"
import {
  anonimizarWhatsapp,
  limparDependenciasDoContato,
} from "@/lib/contatos/limpar-dependencias"
import { agora } from "@/lib/db-utils"
import { registrarAuditLog } from "@/lib/audit"

const schema = z.object({
  whatsapp: z.string().min(10),
  confirmar: z.boolean().optional().default(false),
})

function normalizarWhatsapp(valor: string) {
  return valor.replace(/\D/g, "")
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const whatsapp = normalizarWhatsapp(parsed.data.whatsapp)
  if (whatsapp.length < 10 || whatsapp.length > 15) {
    return NextResponse.json(
      { error: "WhatsApp invalido", message: "Informe o numero com DDI e DDD." },
      { status: 400 }
    )
  }

  const { data: contatosAtivos, error: buscaError } = await supabaseAdmin
    .from("contatos")
    .select("id, nome, tipo, whatsapp, statusFunil, responsavelId, deletadoEm, criadoEm")
    .eq("whatsapp", whatsapp)
    .is("deletadoEm", null)
    .order("criadoEm", { ascending: false })

  if (buscaError) {
    return NextResponse.json({ error: buscaError.message }, { status: 500 })
  }

  if (!parsed.data.confirmar) {
    return NextResponse.json({
      modo: "auditoria",
      whatsapp,
      contatosAtivos: contatosAtivos ?? [],
      mensagem:
        "Envie confirmar=true para limpar estes contatos usando a mesma rotina do botao Excluir.",
    })
  }

  const removidos: string[] = []
  const falhas: Array<{ contatoId: string; erro: string }> = []

  for (const contato of contatosAtivos ?? []) {
    const chatId = `${whatsapp}@s.whatsapp.net`
    try {
      await limparDependenciasDoContato({ contatoId: contato.id, chatId })

      const deletadoEm = agora()
      const whatsappAnonimo = anonimizarWhatsapp(whatsapp, contato.id)
      const { error: updateError } = await supabaseAdmin
        .from("contatos")
        .update({
          whatsapp: whatsappAnonimo,
          deletadoEm,
          atualizadoEm: deletadoEm,
        })
        .eq("id", contato.id)

      if (updateError) throw updateError

      await registrarAuditLog({
        usuarioId: auth.session.user.id,
        acao: "limpar_teste_por_whatsapp",
        entidade: "Contato",
        entidadeId: contato.id,
        dadosAntes: contato as unknown as Record<string, unknown>,
        dadosDepois: {
          deletadoEm,
          whatsappAnonimizado: true,
        },
      })

      removidos.push(contato.id)
    } catch (error) {
      console.error("[contatos/limpar-por-whatsapp] Falha:", {
        contatoId: contato.id,
        whatsapp,
        error,
      })
      falhas.push({ contatoId: contato.id, erro: String(error) })
    }
  }

  const { data: contatoAindaAtivo, error: verificacaoError } = await supabaseAdmin
    .from("contatos")
    .select("id")
    .eq("whatsapp", whatsapp)
    .is("deletadoEm", null)
    .maybeSingle()

  if (verificacaoError) {
    return NextResponse.json({ error: verificacaoError.message }, { status: 500 })
  }

  return NextResponse.json({
    whatsapp,
    removidos,
    falhas,
    whatsappLiberado: !contatoAindaAtivo,
    contatoAindaAtivo: contatoAindaAtivo?.id ?? null,
  })
}
