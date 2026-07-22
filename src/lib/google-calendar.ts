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
 * `conferenceDataVersion: 1` é OBRIGATÓRIO para o Google processar
 * `conferenceData`. Sem ele a API aceita a requisição, ignora o campo em
 * silêncio e devolve um evento sem videochamada — foi exatamente assim que os
 * 14 primeiros eventos do calendário nasceram sem link (auditoria 22/07/2026).
 */
const CONFERENCE_DATA_VERSION = 1

function novoPedidoDeMeet(chaveUnica: string) {
  return {
    createRequest: {
      // requestId identifica o pedido; repetir o mesmo id devolve a mesma
      // conferência em vez de criar outra.
      requestId: chaveUnica,
      conferenceSolutionKey: { type: "hangoutsMeet" },
    },
  }
}

/**
 * Cria evento no Google Calendar com retry exponencial (3 tentativas, 0/500/2000ms).
 * Loga cada falha — antes engolia silenciosamente, fazia agendamento ficar
 * com `sincronizado: false` no banco e ninguem percebia (paciente sem convite).
 *
 * Sempre cria uma videochamada do Meet junto: a reunião de diagnóstico é
 * online, e até 22/07/2026 nascia sem nenhum link.
 */
export async function criarEvento(params: {
  titulo: string
  descricao?: string
  inicio: Date
  fim: Date
  emailPaciente?: string
}): Promise<{
  googleEventId: string
  googleEventUrl: string
  linkReuniao: string | null
} | null> {
  const client = await getCalendarClient()
  if (!client) {
    console.warn("[google-calendar] Sem config OAuth ativa — pulando criacao de evento")
    return null
  }

  const { calendar, calendarId } = client
  const attendees = params.emailPaciente ? [{ email: params.emailPaciente }] : []

  const TENTATIVAS = 3
  const BACKOFFS_MS = [0, 500, 2000]

  for (let i = 0; i < TENTATIVAS; i++) {
    if (BACKOFFS_MS[i] > 0) await new Promise((r) => setTimeout(r, BACKOFFS_MS[i]))
    try {
      const res = await calendar.events.insert({
        calendarId,
        // sendUpdates 'all' faz o Google enviar email de convite pra attendees.
        sendUpdates: "all",
        conferenceDataVersion: CONFERENCE_DATA_VERSION,
        requestBody: {
          summary: params.titulo,
          description: params.descricao,
          start: {
            dateTime: params.inicio.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          end: {
            dateTime: params.fim.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          attendees,
          // requestId precisa ser estável por tentativa mas único por evento:
          // usa o horário do slot, então o retry não cria duas conferências.
          conferenceData: novoPedidoDeMeet(
            `dl-${params.inicio.getTime()}-${i}`
          ),
        },
      })
      const event = res.data
      if (!event.id) {
        console.warn("[google-calendar] insert sem event.id no retorno (tentativa", i + 1, ")")
        continue
      }

      const linkReuniao =
        event.hangoutLink ||
        event.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")
          ?.uri ||
        null

      // Observabilidade do convite: antes não havia como auditar se o Google
      // aceitou o attendee nem se a conferência foi criada. Sem isso, "o
      // paciente não recebeu o e-mail" era indistinguível de "o e-mail nunca
      // foi pedido".
      console.log("[google-calendar] evento criado", {
        eventId: event.id,
        status: event.status,
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          responseStatus: a.responseStatus,
        })),
        temLinkReuniao: Boolean(linkReuniao),
        conferenceStatus:
          event.conferenceData?.createRequest?.status?.statusCode ?? null,
      })

      if (!linkReuniao) {
        console.error(
          "[google-calendar] evento criado SEM link de reuniao — paciente nao tera por onde entrar",
          { eventId: event.id }
        )
      }

      // O Google não envia convite para a própria conta que criou o evento:
      // ele só aparece na agenda dela. Foi o que aconteceu no teste do
      // Dr. Lucas em 14/07/2026 (ele informou o próprio e-mail como paciente e
      // concluiu que a confirmação estava quebrada). Com paciente real o
      // convite sai normalmente.
      const emailCriador = event.creator?.email
      if (
        params.emailPaciente &&
        emailCriador &&
        params.emailPaciente.toLowerCase() === emailCriador.toLowerCase()
      ) {
        console.warn(
          "[google-calendar] email do paciente e o mesmo da conta do calendario — o Google NAO envia convite para o proprio criador. Evento aparece na agenda, mas nenhum email sai.",
          { eventId: event.id, email: emailCriador }
        )
      }

      return {
        googleEventId: event.id,
        googleEventUrl:
          event.htmlLink ||
          `https://calendar.google.com/calendar/r/eventedit/${event.id}`,
        linkReuniao,
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
): Promise<{ ok: boolean; linkReuniao: string | null }> {
  try {
    const client = await getCalendarClient()
    if (!client) {
      console.warn("[google-calendar] atualizarEvento: sem config OAuth ativa")
      return { ok: false, linkReuniao: null }
    }

    const { calendar, calendarId } = client
    const existente = await calendar.events.get({ calendarId, eventId: googleEventId })
    const evento = existente.data

    // Eventos criados antes de 22/07/2026 não têm videochamada. Uma remarcação
    // é a chance de dar link ao paciente sem intervenção manual: se já existe
    // conferência, o spread a preserva; se não existe, pedimos uma agora.
    const jaTemConferencia = Boolean(
      evento.conferenceData?.entryPoints?.length || evento.hangoutLink
    )
    const conferenceData = jaTemConferencia
      ? evento.conferenceData
      : novoPedidoDeMeet(`dl-remarcacao-${googleEventId}`)

    const atualizado = await calendar.events.update({
      calendarId,
      eventId: googleEventId,
      // Notificar attendees sobre a atualizacao (remarcacao, mudanca de
      // titulo etc).
      sendUpdates: "all",
      // Sem esta versão o Google descarta conferenceData silenciosamente e a
      // remarcação apagaria o link do evento.
      conferenceDataVersion: CONFERENCE_DATA_VERSION,
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
        conferenceData,
      },
    })

    const linkReuniao =
      atualizado.data.hangoutLink ||
      atualizado.data.conferenceData?.entryPoints?.find(
        (p) => p.entryPointType === "video"
      )?.uri ||
      null

    console.log("[google-calendar] evento atualizado", {
      eventId: googleEventId,
      criouConferenciaAgora: !jaTemConferencia,
      temLinkReuniao: Boolean(linkReuniao),
    })

    return { ok: true, linkReuniao }
  } catch (err) {
    console.error(
      "[google-calendar] atualizarEvento falhou:",
      err instanceof Error ? err.message : err,
      { googleEventId }
    )
    return { ok: false, linkReuniao: null }
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
