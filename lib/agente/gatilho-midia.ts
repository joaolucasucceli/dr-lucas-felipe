/**
 * Detecta se a mensagem do paciente contem gatilhos que obrigam o envio
 * de midia de marketing. Quando positivo, o loop do agente forca
 * `tool_choice` em `listar_midias` na primeira iteracao — GPT-4o nao pode
 * optar por "descrever" a midia em vez de chamar a ferramenta.
 *
 * Padroes cobrem as formas mais comuns de pedir prova visual:
 * "como fica", "tem foto", "tem video", "antes e depois", "me mostra",
 * "resultado", "tem exemplo", "tem caso", "depoimento", "paciente real", etc.
 */
const GATILHOS: RegExp[] = [
  /\bcomo\s+fic[au]/i,
  /\btem\s+(alguma?|algum)?\s*foto/i,
  /\btem\s+(algum)?\s*v[íi]deo/i,
  /\bantes\s+e\s+depois/i,
  /\bme\s+mostra/i,
  /\bmostra\s+(uma?|um|algum|alguma)?/i,
  /\bresultad[oa]s?\b/i,
  /\btem\s+(algum|alguma|um|uma)?\s*exemplo/i,
  /\btem\s+(algum|alguma|um|uma)?\s*caso/i,
  /\bdepoimento/i,
  /\bpaciente\s+real/i,
  /\bimagem\s+(de|do|da)/i,
  /\bfoto\s+(de|do|da)/i,
  /\bv[íi]deo\s+(de|do|da)/i,
  /\bquero\s+ver/i,
  /\bposso\s+ver/i,
]

export function detectarGatilhoMidia(texto: string): boolean {
  if (!texto) return false
  return GATILHOS.some((re) => re.test(texto))
}
