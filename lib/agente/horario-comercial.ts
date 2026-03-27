const TIMEZONE = "America/Sao_Paulo"

/** Obtém hora e dia da semana em São Paulo */
function obterHoraSP(data?: Date): { hora: number; diaSemana: number } {
  const d = data || new Date()
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    hour: "numeric",
    hour12: false,
    weekday: "short",
  })

  const parts = formatter.formatToParts(d)
  const hora = Number(parts.find((p) => p.type === "hour")?.value || 0)
  const weekday = parts.find((p) => p.type === "weekday")?.value || ""

  // Mapear dia da semana
  const dias: Record<string, number> = {
    dom: 0, "dom.": 0,
    seg: 1, "seg.": 1,
    ter: 2, "ter.": 2,
    qua: 3, "qua.": 3,
    qui: 4, "qui.": 4,
    sex: 5, "sex.": 5,
    sáb: 6, "sáb.": 6, sab: 6, "sab.": 6,
  }

  const diaSemana = dias[weekday.toLowerCase()] ?? d.getDay()

  return { hora, diaSemana }
}

/**
 * Verifica se é horário comercial em São Paulo.
 * Seg-Sex: 8h-18h | Sáb: 8h-12h | Dom: fechado
 */
export function ehHorarioComercial(data?: Date): boolean {
  const { hora, diaSemana } = obterHoraSP(data)

  // Domingo — fechado
  if (diaSemana === 0) return false

  // Sábado — 8h-12h
  if (diaSemana === 6) return hora >= 8 && hora < 12

  // Seg-Sex — 8h-18h
  return hora >= 8 && hora < 18
}
