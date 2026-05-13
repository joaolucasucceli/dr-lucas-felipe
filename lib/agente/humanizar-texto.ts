/**
 * Pós-processa o texto que a IA vai mandar pro WhatsApp pra remover vícios
 * de PT-BR formal que o GPT-4o injeta mesmo com prompt explícito.
 *
 * Hoje:
 *  - remove "às" entre um marcador de dia/data e a hora ("amanhã às 11h" → "amanhã 11h").
 *
 * Mantém propositalmente os casos onde "às" tem função genuína (início de frase,
 * regência verbal — "ligar às 11h" — etc.), atuando só nos padrões que soam call-center.
 */

const PADRAO_DIA_AS_HORA =
  /\b(hoje|amanhã|amanha|depois de amanhã|depois de amanha|ontem|domingo|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|seg|ter|qua|qui|sex|sáb|sab|dom|\d{1,2}\/\d{1,2})\s+às\s+(\d)/gi

export function removerAsAntesDeHora(texto: string): string {
  return texto.replace(PADRAO_DIA_AS_HORA, "$1 $2")
}

export function humanizarTexto(texto: string): string {
  if (!texto) return texto
  return removerAsAntesDeHora(texto)
}
