import { google } from "googleapis"
import { supabaseAdmin } from "@/lib/supabase"

export interface CalendarEvent {
  id: string
  titulo: string
  inicio: Date
  fim: Date
  url?: string
}

async function getCalendarClient() {
  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("clientId, clientSecret, refreshToken, calendarId")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle()

  if (!config || !config.refreshToken) return null

  const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret)
  oauth2.setCredentials({ refresh_token: config.refreshToken })

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2 }),
    calendarId: config.calendarId ?? "primary",
  }
}

/**
 * Cria evento no Google Calendar com retry exponencial (3 tentativas, 0/500/2000ms).
 * Loga cada falha — antes engolia silenciosamente, fazia agendamento ficar
 * com `sincronizado: false` no banco e ninguem percebia (paciente sem convite).
 */
export async function criarEvento(params: {
  titulo: string
  descricao?: string
  inicio: Date
  fim: Date
  emailPaciente?: string
}): Promise<{ googleEventId: string; googleEventUrl: string } | null> {
  const client = await getCalendarClient()
  if (!client) {
    console.warn("[google-calendar] Sem config OAuth ativa — pulando criacao de evento")
    return null
  }

  const { calendar, calendarId } = client
  const attendees = params.emailPaciente ? [{ email: params.emailPaciente }] : []
  const requestBody = {
    summary: params.titulo,
    description: params.descricao,
    start: { dateTime: params.inicio.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: params.fim.toISOString(), timeZone: "America/Sao_Paulo" },
    attendees,
  }

  const TENTATIVAS = 3
  const BACKOFFS_MS = [0, 500, 2000]

  for (let i = 0; i < TENTATIVAS; i++) {
    if (BACKOFFS_MS[i] > 0) await new Promise((r) => setTimeout(r, BACKOFFS_MS[i]))
    try {
      const res = await calendar.events.insert({
        calendarId,
        // sendUpdates 'all' faz o Google enviar email de convite pra attendees.
        sendUpdates: "all",
        requestBody,
      })
      const event = res.data
      if (!event.id) {
        console.warn("[google-calendar] insert sem event.id no retorno (tentativa", i + 1, ")")
        continue
      }
      return {
        googleEventId: event.id,
        googleEventUrl:
          event.htmlLink ||
          `https://calendar.google.com/calendar/r/eventedit/${event.id}`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(
        `[google-calendar] criarEvento tentativa ${i + 1}/${TENTATIVAS} falhou:`,
        msg
      )
    }
  }

  console.error(
    "[google-calendar] criarEvento esgotou retries — agendamento ficara com sincronizado=false. Paciente NAO recebera convite no email.",
    { titulo: params.titulo, inicio: params.inicio.toISOString() }
  )
  return null
}

export async function atualizarEvento(
  googleEventId: string,
  params: {
    titulo?: string
    descricao?: string
    inicio?: Date
    fim?: Date
  }
): Promise<boolean> {
  try {
    const client = await getCalendarClient()
    if (!client) {
      console.warn("[google-calendar] atualizarEvento: sem config OAuth ativa")
      return false
    }

    const { calendar, calendarId } = client
    const existente = await calendar.events.get({ calendarId, eventId: googleEventId })
    const evento = existente.data

    await calendar.events.update({
      calendarId,
      eventId: googleEventId,
      // Notificar attendees sobre a atualizacao (remarcacao, mudanca de
      // titulo etc).
      sendUpdates: "all",
      requestBody: {
        ...evento,
        summary: params.titulo ?? evento.summary,
        description: params.descricao ?? evento.description,
        start: params.inicio
          ? { dateTime: params.inicio.toISOString(), timeZone: "America/Sao_Paulo" }
          : evento.start,
        end: params.fim
          ? { dateTime: params.fim.toISOString(), timeZone: "America/Sao_Paulo" }
          : evento.end,
      },
    })

    return true
  } catch (err) {
    console.error(
      "[google-calendar] atualizarEvento falhou:",
      err instanceof Error ? err.message : err,
      { googleEventId }
    )
    return false
  }
}

export async function cancelarEvento(googleEventId: string): Promise<boolean> {
  try {
    const client = await getCalendarClient()
    if (!client) {
      console.warn("[google-calendar] cancelarEvento: sem config OAuth ativa")
      return false
    }

    const { calendar, calendarId } = client
    // Notificar attendees sobre o cancelamento.
    await calendar.events.delete({
      calendarId,
      eventId: googleEventId,
      sendUpdates: "all",
    })
    return true
  } catch (err) {
    console.error(
      "[google-calendar] cancelarEvento falhou:",
      err instanceof Error ? err.message : err,
      { googleEventId }
    )
    return false
  }
}

export async function listarEventos(inicio: Date, fim: Date): Promise<CalendarEvent[]> {
  try {
    const client = await getCalendarClient()
    if (!client) {
      console.warn("[google-calendar] listarEventos: sem config OAuth ativa — retornando []")
      return []
    }

    const { calendar, calendarId } = client

    const res = await calendar.events.list({
      calendarId,
      timeMin: inicio.toISOString(),
      timeMax: fim.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    })

    return (res.data.items || [])
      .filter((e) => e.id && e.start?.dateTime)
      .map((e) => ({
        id: e.id!,
        titulo: e.summary || "(sem título)",
        inicio: new Date(e.start!.dateTime!),
        fim: new Date(e.end!.dateTime!),
        url: e.htmlLink || undefined,
      }))
  } catch (err) {
    // Critico — `consultar_agenda` (tool da IA) usa esta funcao. Falha aqui
    // = IA propoe horarios sem cruzar com Google Calendar.
    console.error(
      "[google-calendar] listarEventos falhou — agente vai propor slots sem cruzar com Google Calendar:",
      err instanceof Error ? err.message : err
    )
    return []
  }
}
