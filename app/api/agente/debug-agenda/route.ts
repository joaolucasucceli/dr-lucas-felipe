import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { listarEventos } from "@/lib/google-calendar"
import {
  gerarSlotsCandidatos,
  slotConflitaCom,
  formatarLabelSlot,
  type Ocupacao,
} from "@/lib/agente/slots-agenda"
import { carregarFeriadosNoIntervalo, ymdSP } from "@/lib/agendamento/feriados"
import { requireAuth } from "@/lib/auth-helpers"
import { redis } from "@/lib/redis"

/**
 * Endpoint de diagnostico — retorna o estado completo da agenda da IA:
 * config Google Calendar em uso, eventos no calendar, agendamentos no DB,
 * feriados no periodo, slots gerados/filtrados, primeiros slots livres.
 *
 * GET /api/agente/debug-agenda — read-only, requer login do painel.
 * Util quando consultar_agenda retorna vazio inesperadamente.
 */
export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const agora = new Date()
  const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000)
  const em14dias = new Date(amanha.getTime() + 14 * 24 * 60 * 60 * 1000)

  // 1. Config google calendar ativa
  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("calendarId, ativo, refreshToken, atualizadoEm")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle()

  const configResumo = {
    encontrada: !!config,
    calendarId: config?.calendarId ?? null,
    temRefreshToken: !!config?.refreshToken,
    atualizadoEm: config?.atualizadoEm ?? null,
  }

  // 2. Eventos no Google Calendar (proximos 14 dias)
  let eventosCalendar: Array<{ inicio: Date; fim: Date; titulo: string }> = []
  let erroCalendar: string | null = null
  try {
    const ev = await listarEventos(amanha, em14dias)
    eventosCalendar = ev.map((e) => ({ inicio: e.inicio, fim: e.fim, titulo: e.titulo }))
  } catch (e) {
    erroCalendar = e instanceof Error ? e.message : String(e)
  }

  // 3. Agendamentos no DB (proximos 14 dias)
  const { data: agendamentosDb } = await supabaseAdmin
    .from("agendamentos")
    .select("id, dataHora, duracao, status, criadoPor")
    .in("status", ["agendado", "confirmado", "remarcado"])
    .gte("dataHora", amanha.toISOString())
    .lte("dataHora", em14dias.toISOString())

  // 4. Feriados no periodo
  const feriados = await carregarFeriadosNoIntervalo(amanha, em14dias)

  // 5. Calcular slots como o consultar_agenda faz
  const ocupacoes: Ocupacao[] = [
    ...eventosCalendar.map((e) => ({ inicio: e.inicio, fim: e.fim })),
    ...(agendamentosDb ?? []).map((a) => {
      const inicio = new Date(a.dataHora)
      const dur = a.duracao ?? 60
      return { inicio, fim: new Date(inicio.getTime() + dur * 60_000) }
    }),
  ]

  const candidatos = gerarSlotsCandidatos(amanha, em14dias, 60)
  const futuros = candidatos.filter((s) => s.getTime() > agora.getTime())
  const naoFeriados = futuros.filter((s) => !feriados.has(ymdSP(s)))
  const livres = naoFeriados.filter((s) => !slotConflitaCom(s, 60, ocupacoes))

  // 6. Ultimas chamadas reais que a IA fez ao consultar-agenda
  let ultimasChamadasIA: unknown[] = []
  try {
    const raws = await redis.lrange("agente:debug:consultar-agenda", 0, 4)
    ultimasChamadasIA = raws.map((r) => {
      try {
        return typeof r === "string" ? JSON.parse(r) : r
      } catch {
        return r
      }
    })
  } catch {
    ultimasChamadasIA = []
  }

  return NextResponse.json({
    agoraServidor: agora.toISOString(),
    periodoAnalisado: {
      inicio: amanha.toISOString(),
      fim: em14dias.toISOString(),
    },
    ultimasChamadasIA,
    googleCalendar: {
      ...configResumo,
      erro: erroCalendar,
      qtdEventos: eventosCalendar.length,
      eventos: eventosCalendar.slice(0, 20).map((e) => ({
        titulo: e.titulo,
        inicio: e.inicio.toISOString(),
        fim: e.fim.toISOString(),
      })),
    },
    banco: {
      qtdAgendamentos: (agendamentosDb ?? []).length,
      agendamentos: (agendamentosDb ?? []).slice(0, 20),
    },
    feriados: {
      qtd: feriados.size,
      datas: Array.from(feriados),
    },
    contadores: {
      candidatosTotal: candidatos.length,
      apósFiltroFuturo: futuros.length,
      apósFiltroFeriado: naoFeriados.length,
      apósFiltroConflito: livres.length,
    },
    primeirosSlotsLivres: livres.slice(0, 10).map((s) => ({
      dataIso: s.toISOString(),
      label: formatarLabelSlot(s),
    })),
  })
}
