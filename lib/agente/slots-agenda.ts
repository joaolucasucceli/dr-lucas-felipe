const TIMEZONE = "America/Sao_Paulo"

// Expediente por dia da semana (0=dom, 1=seg, ..., 6=sáb). null = fechado.
const EXPEDIENTE: Record<number, { abertura: number; fechamento: number } | null> = {
  0: null,
  1: { abertura: 8, fechamento: 18 },
  2: { abertura: 8, fechamento: 18 },
  3: { abertura: 8, fechamento: 18 },
  4: { abertura: 8, fechamento: 18 },
  5: { abertura: 8, fechamento: 18 },
  6: { abertura: 8, fechamento: 12 },
}

/** Retorna "YYYY-MM-DD" e diaSemana (0-6) considerando timezone SP. */
function partesDataSP(data: Date): { ymd: string; diaSemana: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  })
  const parts = fmt.formatToParts(data)
  const ano = parts.find((p) => p.type === "year")!.value
  const mes = parts.find((p) => p.type === "month")!.value
  const dia = parts.find((p) => p.type === "day")!.value
  const weekday = parts.find((p) => p.type === "weekday")!.value.toLowerCase()
  const mapa: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  }
  return { ymd: `${ano}-${mes}-${dia}`, diaSemana: mapa[weekday] ?? 0 }
}

/** Constrói um Date a partir de "YYYY-MM-DD" + hora, interpretado em SP (-03:00). */
function criarDataSP(ymd: string, hora: number): Date {
  const hh = String(hora).padStart(2, "0")
  return new Date(`${ymd}T${hh}:00:00-03:00`)
}

/** Incrementa "YYYY-MM-DD" em N dias (sem depender de timezone). */
function somarDiasYmd(ymd: string, dias: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCDate(base.getUTCDate() + dias)
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`
}

export interface Ocupacao {
  inicio: Date
  fim: Date
}

/**
 * Gera slots candidatos de hora cheia dentro do expediente (SP),
 * entre dataInicio e dataFim, com duração informada.
 * Slots onde `hora + duracaoMin` ultrapassa o fechamento do dia são excluídos.
 */
export function gerarSlotsCandidatos(
  dataInicio: Date,
  dataFim: Date,
  duracaoMin: number
): Date[] {
  const { ymd: ymdInicio } = partesDataSP(dataInicio)
  const { ymd: ymdFim } = partesDataSP(dataFim)

  const slots: Date[] = []
  let ymd = ymdInicio
  let guard = 0

  while (ymd <= ymdFim && guard < 90) {
    const data = criarDataSP(ymd, 0)
    const { diaSemana } = partesDataSP(data)
    const expediente = EXPEDIENTE[diaSemana]

    if (expediente) {
      const duracaoHoras = duracaoMin / 60
      for (let hora = expediente.abertura; hora + duracaoHoras <= expediente.fechamento; hora++) {
        slots.push(criarDataSP(ymd, hora))
      }
    }

    ymd = somarDiasYmd(ymd, 1)
    guard++
  }

  return slots
}

/** Verifica se um slot conflita com qualquer ocupação (overlap). */
export function slotConflitaCom(
  slotInicio: Date,
  duracaoMin: number,
  ocupacoes: Ocupacao[]
): boolean {
  const slotFim = new Date(slotInicio.getTime() + duracaoMin * 60_000)
  return ocupacoes.some(
    (o) => slotInicio < o.fim && slotFim > o.inicio
  )
}

/** Formata slot para exibição ao paciente: "quarta, 22 de abril, 09:00" */
export function formatarLabelSlot(data: Date): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(data)
  const diaSemana = parts.find((p) => p.type === "weekday")?.value ?? ""
  const dia = parts.find((p) => p.type === "day")?.value ?? ""
  const mes = parts.find((p) => p.type === "month")?.value ?? ""
  const hora = parts.find((p) => p.type === "hour")?.value ?? ""
  const minuto = parts.find((p) => p.type === "minute")?.value ?? ""
  return `${diaSemana}, ${dia} de ${mes}, ${hora}:${minuto}`
}
