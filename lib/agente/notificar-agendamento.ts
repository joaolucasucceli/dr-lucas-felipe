import { supabaseAdmin } from "@/lib/supabase"
import { enviarMensagem } from "@/lib/uazapi"
import { getBaseUrl } from "@/lib/env"

/**
 * JLU-170 (P3+P4 25/05/2026): notifica Dr. Lucas no WhatsApp pessoal a cada
 * agendamento (ao criar) e a cada confirmacao de presenca (na hora).
 *
 * Decisao Joao 25/05: nao-bloqueante. IA segue agendando direto, Lucas recebe
 * info pra cruzar com agenda real dele. Se houver conflito, ele remarca manual.
 *
 * Padrao reusa logica de `notificar-handoff.ts` — mesmo numero pessoal
 * (DR_LUCAS_WHATSAPP_PESSOAL), mesma instancia Uazapi (config_whatsapp ativa).
 */

function formatarDataHoraBR(iso: string): {
  diaLabel: string
  horaLabel: string
  completo: string
} {
  const dt = new Date(iso)
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).format(dt)
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).format(dt)
  return {
    diaLabel: dia,
    horaLabel: hora.endsWith(":00") ? hora.replace(":00", "h") : hora.replace(":", "h"),
    completo: `${dia} às ${hora}`,
  }
}

async function obterConfigEnvio() {
  const numeroPessoal = (process.env.DR_LUCAS_WHATSAPP_PESSOAL ?? "").trim()
  if (!numeroPessoal) {
    console.warn(
      "[notificar-agendamento] DR_LUCAS_WHATSAPP_PESSOAL nao configurada — Lucas nao vai receber ping"
    )
    return null
  }

  const { data: configWa } = await supabaseAdmin
    .from("config_whatsapp")
    .select("uazapiUrl, instanceToken")
    .eq("ativo", true)
    .order("atualizadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!configWa?.uazapiUrl || !configWa?.instanceToken) {
    console.error("[notificar-agendamento] config_whatsapp ausente — nao posso notificar")
    return null
  }

  return { numeroPessoal, uazapiUrl: configWa.uazapiUrl, token: configWa.instanceToken }
}

/**
 * Ping 1 — disparado APOS registrar_agendamento criar o agendamento com sucesso.
 * Avisa Lucas que tem novo paciente marcado pra ele alinhar com agenda dele.
 *
 * Falha silenciosa: nunca derruba o fluxo do paciente. Se Uazapi der erro,
 * loga e segue.
 */
export async function pingAgendado(agendamentoId: string): Promise<void> {
  try {
    const cfg = await obterConfigEnvio()
    if (!cfg) return

    const { data: ag } = await supabaseAdmin
      .from("agendamentos")
      .select(
        "id, dataHora, observacao, contato:contatos(nome, whatsapp), procedimento:procedimentos(nome, escopoOferta)"
      )
      .eq("id", agendamentoId)
      .maybeSingle()

    if (!ag) {
      console.warn("[notificar-agendamento] pingAgendado: agendamento nao encontrado", agendamentoId)
      return
    }

    const contato = ag.contato as { nome: string | null; whatsapp: string | null } | null
    const proc = ag.procedimento as { nome: string | null; escopoOferta: string | null } | null

    const nomeLimpo = contato?.nome?.replace(/^WhatsApp\s+/, "") || "Paciente sem nome"
    const tel = contato?.whatsapp || "(sem WhatsApp registrado)"
    const procTxt = proc?.escopoOferta || proc?.nome || "Procedimento ainda não definido"

    const { diaLabel, horaLabel } = formatarDataHoraBR(ag.dataHora)
    const linkConversa = `${getBaseUrl()}/contatos/${(ag as { contatoId?: string }).contatoId ?? ""}`

    const mensagem = [
      `📅 Novo agendamento — ${nomeLimpo}`,
      `${diaLabel} às ${horaLabel}`,
      `Procedimento: ${procTxt}`,
      `WhatsApp: ${tel}`,
      ``,
      `Confere com sua agenda — se bater conflito, é só remarcar pelo painel.`,
      `Conversa: ${linkConversa}`,
    ].join("\n")

    await enviarMensagem(cfg.uazapiUrl, cfg.token, cfg.numeroPessoal, mensagem)
    console.log("[notificar-agendamento] pingAgendado OK", { agendamentoId })
  } catch (e) {
    console.error("[notificar-agendamento] pingAgendado falhou (silencioso):", e)
  }
}

/**
 * Ping 2 — disparado APOS confirmar_agendamento mudar status pra "confirmado".
 * Avisa Lucas que o paciente confirmou presenca. Inclui quanto tempo falta
 * (em horas) pra ele se planejar.
 *
 * Falha silenciosa.
 */
export async function pingConfirmadoDia(agendamentoId: string): Promise<void> {
  try {
    const cfg = await obterConfigEnvio()
    if (!cfg) return

    const { data: ag } = await supabaseAdmin
      .from("agendamentos")
      .select(
        "id, dataHora, contatoId, contato:contatos(nome), procedimento:procedimentos(nome, escopoOferta)"
      )
      .eq("id", agendamentoId)
      .maybeSingle()

    if (!ag) {
      console.warn(
        "[notificar-agendamento] pingConfirmadoDia: agendamento nao encontrado",
        agendamentoId
      )
      return
    }

    const contato = ag.contato as { nome: string | null } | null
    const proc = ag.procedimento as { nome: string | null; escopoOferta: string | null } | null
    const nomeLimpo = contato?.nome?.replace(/^WhatsApp\s+/, "") || "Paciente"
    const procTxt = proc?.escopoOferta || proc?.nome || "—"

    const { horaLabel } = formatarDataHoraBR(ag.dataHora)
    const horasFaltam = Math.max(
      0,
      Math.round((new Date(ag.dataHora).getTime() - Date.now()) / 3_600_000)
    )

    const quandoTxt =
      horasFaltam === 0
        ? "começa agora"
        : horasFaltam === 1
          ? "em 1h"
          : horasFaltam < 24
            ? `em ~${horasFaltam}h`
            : `daqui a ${Math.round(horasFaltam / 24)} dia(s)`

    const linkConversa = `${getBaseUrl()}/contatos/${ag.contatoId}`

    const mensagem = [
      `✅ ${nomeLimpo} confirmou presença`,
      `Avaliação às ${horaLabel} (${quandoTxt})`,
      `Procedimento: ${procTxt}`,
      ``,
      `Conversa: ${linkConversa}`,
    ].join("\n")

    await enviarMensagem(cfg.uazapiUrl, cfg.token, cfg.numeroPessoal, mensagem)
    console.log("[notificar-agendamento] pingConfirmadoDia OK", { agendamentoId, horasFaltam })
  } catch (e) {
    console.error("[notificar-agendamento] pingConfirmadoDia falhou (silencioso):", e)
  }
}
