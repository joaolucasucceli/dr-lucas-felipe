// Helpers de data brasileira pra agendamento.
// Input nativo type="datetime-local" tem formato MM/DD/AAAA em navegadores
// com locale en-US — confunde usuario brasileiro. Usamos 2 inputs:
// data em texto livre dd/mm[/aaaa] + hora type="time". Se o ano nao for
// fornecido, completamos automatico (ano atual ou +1 se a data ja passou).

export const REGEX_DATA_BR = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/

export function isoParaDataBr(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function isoParaHora(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const hh = String(d.getHours()).padStart(2, "0")
  const mn = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mn}`
}

export function dataBrEHoraParaIso(dataBr: string, hora: string): string | null {
  const m = dataBr.match(REGEX_DATA_BR)
  if (!m) return null
  const [, dd, mm, yyyyRaw] = m
  const hm = hora.match(/^(\d{2}):(\d{2})$/)
  if (!hm) return null
  const [, hh, mn] = hm

  // Se ano nao fornecido, usa ano atual; se a data ja passou, vai pro proximo ano.
  let ano: number
  if (yyyyRaw) {
    ano = Number(yyyyRaw)
  } else {
    const hoje = new Date()
    const candidato = new Date(
      hoje.getFullYear(),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(mn)
    )
    ano = candidato.getTime() < hoje.getTime() ? hoje.getFullYear() + 1 : hoje.getFullYear()
  }

  const d = new Date(ano, Number(mm) - 1, Number(dd), Number(hh), Number(mn))
  if (isNaN(d.getTime())) return null
  // Sanity check: campos batem (evita 31/02 virando 03/03)
  if (
    d.getFullYear() !== ano ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) {
    return null
  }
  return d.toISOString()
}

/** Mascara dd/mm/aaaa enquanto o usuario digita. */
export function mascararDataBr(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`
}
