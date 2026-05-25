import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { criarId } from "@/lib/db-utils"
import { enviarMensagem } from "@/lib/uazapi"
import { getBaseUrl } from "@/lib/env"

// JLU-170 v2 (B 25/05/2026): tool nova chamada pela Ana Julia quando o gestor
// tem `exigirAprovacaoAgendamento=true` no perfil dele. Em vez de chamar
// registrar_agendamento direto (cria agendamento), chama essa: cria registro
// pendente + manda WhatsApp pro gestor com link de aprovacao.

const schema = z.object({
  contatoId: z.string().min(1),
  conversaId: z.string().min(1).optional(),
  dataHora: z.string().datetime({ offset: true }),
  procedimentoId: z.string().min(1).optional(),
  email: z.string().email(),
  observacao: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { contatoId, conversaId, dataHora, procedimentoId, email, observacao } = parsed.data

  // Idempotente: se ja existe aprovacao aguardando pra esse contato com mesma
  // dataHora, retorna a existente (evita duplicar pings pro Lucas).
  // Cast pra any: tabela `aprovacoes_agendamento` nao esta nos types ainda
  // (JLU-170 v2 — db:types precisa SUPABASE_ACCESS_TOKEN PAT pra regerar).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any
  const { data: existente } = await sb
    .from("aprovacoes_agendamento")
    .select("id, status")
    .eq("contatoId", contatoId)
    .eq("dataHora", new Date(dataHora).toISOString())
    .eq("status", "aguardando")
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ ok: true, aprovacaoId: existente.id, jaPendente: true })
  }

  const id = criarId()
  const { error } = await sb.from("aprovacoes_agendamento").insert({
    id,
    contatoId,
    conversaId: conversaId ?? null,
    dataHora,
    procedimentoId: procedimentoId ?? null,
    email,
    observacao: observacao ?? null,
    status: "aguardando",
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notificacao WhatsApp pro Lucas (fire-and-forget, falha silenciosa)
  void notificarLucasAprovacaoPendente(id, contatoId, dataHora, procedimentoId)

  return NextResponse.json({ ok: true, aprovacaoId: id, jaPendente: false })
}

async function notificarLucasAprovacaoPendente(
  aprovacaoId: string,
  contatoId: string,
  dataHora: string,
  procedimentoId?: string | null
) {
  try {
    const numeroPessoal = (process.env.DR_LUCAS_WHATSAPP_PESSOAL ?? "").trim()
    if (!numeroPessoal) return

    const { data: configWa } = await supabaseAdmin
      .from("config_whatsapp")
      .select("uazapiUrl, instanceToken")
      .eq("ativo", true)
      .order("atualizadoEm", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!configWa?.uazapiUrl || !configWa?.instanceToken) return

    const { data: contato } = await supabaseAdmin
      .from("contatos")
      .select("nome, whatsapp")
      .eq("id", contatoId)
      .maybeSingle()

    let procNome = "Procedimento não definido"
    if (procedimentoId) {
      const { data: proc } = await supabaseAdmin
        .from("procedimentos")
        .select("nome, escopoOferta")
        .eq("id", procedimentoId)
        .maybeSingle()
      const p = proc as { nome: string | null; escopoOferta: string | null } | null
      procNome = p?.escopoOferta || p?.nome || procNome
    }

    const dt = new Date(dataHora)
    const dataBR = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      day: "numeric",
      month: "numeric",
    }).format(dt)
    const horaBR = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).format(dt)

    const nomeLimpo = contato?.nome?.replace(/^WhatsApp\s+/, "") || "Paciente"
    const linkAprovacao = `${getBaseUrl()}/aprovacoes-pendentes`

    const mensagem = [
      `⏳ Aprovação pendente — ${nomeLimpo}`,
      `Quer ${dataBR} às ${horaBR}`,
      `Procedimento: ${procNome}`,
      ``,
      `Abre pra aprovar/sugerir outro/cancelar:`,
      linkAprovacao,
    ].join("\n")

    await enviarMensagem(
      configWa.uazapiUrl,
      configWa.instanceToken,
      numeroPessoal,
      mensagem
    )
  } catch (e) {
    console.error("[solicitar-aprovacao-horario] notificacao falhou (silencioso):", e)
  }
}
