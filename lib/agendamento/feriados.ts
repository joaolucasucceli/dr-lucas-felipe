import { supabaseAdmin } from "@/lib/supabase"

const TZ = "America/Sao_Paulo"

/** "YYYY-MM-DD" da data interpretada em America/Sao_Paulo. */
function ymdSP(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data)
}

/** Retorna o nome do feriado se a data cair em feriado (TZ SP), senao null. */
export async function nomeFeriadoSP(data: Date): Promise<string | null> {
  const ymd = ymdSP(data)
  const { data: row } = await supabaseAdmin
    .from("feriados")
    .select("nome")
    .eq("data", ymd)
    .maybeSingle()
  return row?.nome ?? null
}

/** Retorna Set<"YYYY-MM-DD"> com feriados entre dataInicio e dataFim (TZ SP). */
export async function carregarFeriadosNoIntervalo(
  dataInicio: Date,
  dataFim: Date
): Promise<Set<string>> {
  const inicioYmd = ymdSP(dataInicio)
  const fimYmd = ymdSP(dataFim)
  const { data } = await supabaseAdmin
    .from("feriados")
    .select("data")
    .gte("data", inicioYmd)
    .lte("data", fimYmd)
  return new Set((data ?? []).map((r) => r.data))
}

export { ymdSP }
