import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"
import { listarEventos } from "@/lib/google-calendar"
import {
  gerarSlotsCandidatos,
  slotConflitaCom,
  formatarLabelSlot,
  type Ocupacao,
} from "@/lib/agente/slots-agenda"

const MAX_SLOTS = 10
const DURACAO_DEFAULT_MIN = 60
const DIAS_DEFAULT_RANGE = 14

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: {
    dataInicio?: string
    dataFim?: string
    duracaoMinutos?: number
    procedimentoId?: string
  }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const agora = new Date()
  const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000)

  const dataInicio = body.dataInicio ? new Date(body.dataInicio) : amanha
  const dataFim = body.dataFim
    ? new Date(body.dataFim)
    : new Date(dataInicio.getTime() + DIAS_DEFAULT_RANGE * 24 * 60 * 60 * 1000)

  let duracaoMin = body.duracaoMinutos ?? DURACAO_DEFAULT_MIN

  if (body.procedimentoId) {
    const { data: proc } = await supabaseAdmin
      .from("procedimentos")
      .select("duracaoMin")
      .eq("id", body.procedimentoId)
      .is("deletadoEm", null)
      .maybeSingle()
    if (proc?.duracaoMin) duracaoMin = proc.duracaoMin
  }

  const eventosCalendar = await listarEventos(dataInicio, dataFim)

  const { data: agendamentosDb } = await supabaseAdmin
    .from("agendamentos")
    .select("dataHora, duracao")
    .in("status", ["agendado", "confirmado", "remarcado"])
    .gte("dataHora", dataInicio.toISOString())
    .lte("dataHora", dataFim.toISOString())

  const ocupacoes: Ocupacao[] = [
    ...eventosCalendar.map((e) => ({ inicio: e.inicio, fim: e.fim })),
    ...(agendamentosDb ?? []).map((a) => {
      const inicio = new Date(a.dataHora)
      const dur = a.duracao ?? DURACAO_DEFAULT_MIN
      return { inicio, fim: new Date(inicio.getTime() + dur * 60_000) }
    }),
  ]

  const candidatos = gerarSlotsCandidatos(dataInicio, dataFim, duracaoMin)

  const slotsLivres = candidatos
    .filter((slot) => slot.getTime() > agora.getTime())
    .filter((slot) => !slotConflitaCom(slot, duracaoMin, ocupacoes))
    .slice(0, MAX_SLOTS)
    .map((slot) => ({
      dataIso: slot.toISOString(),
      label: formatarLabelSlot(slot),
    }))

  return NextResponse.json({
    slots: slotsLivres,
    periodoConsultado: {
      inicio: dataInicio.toISOString(),
      fim: dataFim.toISOString(),
    },
  })
}
