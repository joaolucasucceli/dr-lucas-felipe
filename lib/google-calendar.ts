import { google } from "googleapis"
import { prisma } from "@/lib/prisma"

export interface CalendarEvent {
  id: string
  titulo: string
  inicio: Date
  fim: Date
  url?: string
}

async function getCalendarClient() {
  const config = await prisma.configGoogleCalendar.findFirst({
    where: { ativo: true },
  })
  if (!config || !config.refreshToken) return null

  const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret)
  oauth2.setCredentials({ refresh_token: config.refreshToken })

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2 }),
    calendarId: config.calendarId ?? "primary",
  }
}

export async function criarEvento(params: {
  titulo: string
  descricao?: string
  inicio: Date
  fim: Date
  emailPaciente?: string
}): Promise<{ googleEventId: string; googleEventUrl: string } | null> {
  try {
    const client = await getCalendarClient()
    if (!client) return null

    const { calendar, calendarId } = client

    const attendees = params.emailPaciente
      ? [{ email: params.emailPaciente }]
      : []

    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: params.titulo,
        description: params.descricao,
        start: { dateTime: params.inicio.toISOString(), timeZone: "America/Sao_Paulo" },
        end: { dateTime: params.fim.toISOString(), timeZone: "America/Sao_Paulo" },
        attendees,
      },
    })

    const event = res.data
    if (!event.id) return null

    return {
      googleEventId: event.id,
      googleEventUrl: event.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${event.id}`,
    }
  } catch {
    return null
  }
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
    if (!client) return false

    const { calendar, calendarId } = client

    const existente = await calendar.events.get({ calendarId, eventId: googleEventId })
    const evento = existente.data

    await calendar.events.update({
      calendarId,
      eventId: googleEventId,
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
  } catch {
    return false
  }
}

export async function cancelarEvento(googleEventId: string): Promise<boolean> {
  try {
    const client = await getCalendarClient()
    if (!client) return false

    const { calendar, calendarId } = client
    await calendar.events.delete({ calendarId, eventId: googleEventId })
    return true
  } catch {
    return false
  }
}

export async function listarEventos(inicio: Date, fim: Date): Promise<CalendarEvent[]> {
  try {
    const client = await getCalendarClient()
    if (!client) return []

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
  } catch {
    return []
  }
}
