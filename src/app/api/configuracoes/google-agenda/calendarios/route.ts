import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { google } from "googleapis"
import { supabaseAdmin } from "@/lib/supabase"
import { requireRole } from "@/lib/auth-helpers"
import { escolherCalendarIdSchema } from "@/lib/validations/config-google"
import { agora } from "@/lib/db-utils"

/** Lista as agendas do Google Calendar acessiveis com o token salvo. */
export async function GET(_request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("clientId, clientSecret, refreshToken")
    .eq("ativo", true)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config?.refreshToken) {
    return NextResponse.json(
      { error: "Conecte com o Google primeiro" },
      { status: 400 }
    )
  }

  try {
    const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret)
    oauth2.setCredentials({ refresh_token: config.refreshToken })
    const cal = google.calendar({ version: "v3", auth: oauth2 })

    const res = await cal.calendarList.list({ maxResults: 100 })
    const agendas = (res.data.items ?? [])
      .filter((c) =>
        c.accessRole === "owner" || c.accessRole === "writer"
      )
      .map((c) => ({
        id: c.id ?? "",
        nome: c.summary ?? "(sem nome)",
        primary: !!c.primary,
        descricao: c.description ?? null,
      }))

    return NextResponse.json({ agendas })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro ao listar agendas do Google",
      },
      { status: 500 }
    )
  }
}

/** Atualiza qual agenda do Google Calendar a IA usa. */
export async function PATCH(request: NextRequest) {
  const auth = await requireRole("gestor")
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = escolherCalendarIdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: config } = await supabaseAdmin
    .from("config_google_calendar")
    .select("id")
    .eq("ativo", true)
    .order("criadoEm", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config) {
    return NextResponse.json(
      { error: "Configuração não encontrada" },
      { status: 404 }
    )
  }

  const { error } = await supabaseAdmin
    .from("config_google_calendar")
    .update({ calendarId: parsed.data.calendarId, atualizadoEm: agora() })
    .eq("id", config.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true, calendarId: parsed.data.calendarId })
}
