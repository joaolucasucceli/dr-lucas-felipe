import { supabaseAdmin } from "@/lib/supabase"
import { listarEventos } from "@/lib/google-calendar"
import {
  gerarSlotsCandidatos,
  slotConflitaCom,
  type Ocupacao,
} from "@/lib/agente/slots-agenda"
import { nomeFeriadoSP } from "./feriados"

export interface ResultadoValidacao {
  ok: boolean
  motivo?: string
}

/**
 * Valida se um agendamento pode ser criado/movido pra dataHora dada.
 * Usado pela Ana Julia (registrar-agendamento) e pela edicao via painel
 * (PATCH /api/agendamentos/[id], reagendar). Bloqueia: fora de expediente
 * (seg-sex 8-18, sab 8-12), feriado nacional, conflito com Google
 * Calendar, conflito com agendamento existente.
 *
 * Para evitar falso conflito ao remarcar um agendamento existente, passe
 * `ignorarAgendamentoId` — esse id nao entra na lista de ocupacoes.
 */
export async function validarSlotManual(
  dataHora: Date,
  duracaoMin: number,
  ignorarAgendamentoId?: string
): Promise<ResultadoValidacao> {
  if (isNaN(dataHora.getTime())) {
    return { ok: false, motivo: "Data/hora inválida" }
  }

  if (dataHora.getTime() < Date.now()) {
    return { ok: false, motivo: "Data/hora já passou" }
  }

  // 1. Expediente: usa o mesmo gerador da IA. Se a hora exata nao bate
  // com nenhum slot candidato do dia, e fora do expediente.
  const inicioDia = new Date(dataHora)
  inicioDia.setHours(0, 0, 0, 0)
  const fimDia = new Date(dataHora)
  fimDia.setHours(23, 59, 59, 999)

  const candidatos = gerarSlotsCandidatos(inicioDia, fimDia, duracaoMin)
  const horaBate = candidatos.some(
    (s) => s.getTime() === dataHora.getTime()
  )
  if (!horaBate) {
    return {
      ok: false,
      motivo:
        "Fora do horário de atendimento (seg-sex 8h-18h, sáb 8h-12h, hora cheia)",
    }
  }

  // 2. Feriado
  const feriado = await nomeFeriadoSP(dataHora)
  if (feriado) {
    return { ok: false, motivo: `Data é feriado: ${feriado}` }
  }

  // 3. Conflito com Google Calendar + agendamentos no banco
  const fim = new Date(dataHora.getTime() + duracaoMin * 60_000)

  const [eventosCalendar, agendamentosDb] = await Promise.all([
    listarEventos(dataHora, fim),
    supabaseAdmin
      .from("agendamentos")
      .select("id, dataHora, duracao")
      .in("status", ["agendado", "remarcado"])
      .gte("dataHora", new Date(dataHora.getTime() - 4 * 60 * 60_000).toISOString())
      .lte("dataHora", fim.toISOString()),
  ])

  const ocupacoesCalendar: Ocupacao[] = eventosCalendar.map((e) => ({
    inicio: e.inicio,
    fim: e.fim,
  }))
  const ocupacoesDb: Ocupacao[] = (agendamentosDb.data ?? [])
    .filter((a) => a.id !== ignorarAgendamentoId)
    .map((a) => {
      const inicio = new Date(a.dataHora)
      const dur = a.duracao ?? 60
      return { inicio, fim: new Date(inicio.getTime() + dur * 60_000) }
    })

  if (slotConflitaCom(dataHora, duracaoMin, ocupacoesDb)) {
    return { ok: false, motivo: "Conflito com outro agendamento da clínica nesse horário" }
  }

  if (slotConflitaCom(dataHora, duracaoMin, ocupacoesCalendar)) {
    return {
      ok: false,
      motivo: "Conflito com um evento da agenda do Dr. Lucas nesse horário",
    }
  }

  return { ok: true }
}
