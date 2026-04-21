import { formatInTimeZone } from "date-fns-tz"
import { ptBR } from "date-fns/locale"

const TZ = "America/Sao_Paulo"

/** Formata timestamp ISO em America/Sao_Paulo com locale pt-BR.
 *  Uso: formatarData(iso, "dd/MM/yyyy 'as' HH:mm") */
export function formatarData(
  data: string | Date,
  pattern: string
): string {
  return formatInTimeZone(new Date(data), TZ, pattern, { locale: ptBR })
}

/** Formata WhatsApp numerico (55DDNNNNNNNNN) como +55 (DD) 9XXXX-XXXX.
 *  Se nao conseguir parsear, devolve o input. */
export function formatarWhatsapp(raw: string | null | undefined): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  const m = digits.match(/^(?:55)?([1-9]\d)(9?\d{4})(\d{4})$/)
  if (!m) return raw
  const [, ddd, parte1, parte2] = m
  const parte1Fmt = parte1.length === 5 ? parte1 : `9${parte1}`
  return `+55 (${ddd}) ${parte1Fmt}-${parte2}`
}
