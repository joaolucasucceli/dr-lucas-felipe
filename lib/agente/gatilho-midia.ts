/**
 * Detecta se a mensagem do paciente contem gatilhos que obrigam o envio
 * de midia de marketing. Quando positivo, o loop do agente forca
 * `tool_choice` em `listar_midias` na primeira iteracao — GPT-4o nao pode
 * optar por "descrever" a midia em vez de chamar a ferramenta.
 *
 * Cobre dois casos de uso:
 * 1. **Prova visual de procedimento**: "como fica", "tem foto", "antes
 *    e depois", "me mostra", "resultado", "quero ver" etc.
 * 2. **Apresentar o Dr. Lucas** (JLAU-559): "me fala sobre o Dr.", "quem
 *    e o Dr.", "qual a experiencia", "ele e bom" etc. — Cliente precisa
 *    ter cadastrado midia com descricao rica sobre a apresentacao do
 *    medico para a IA escolher automaticamente.
 */
const GATILHOS: RegExp[] = [
  // Prova visual de procedimento
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

  // Apresentacao do Dr. Lucas (JLAU-559)
  /\bme\s+fala\s+(do|sobre\s+o)\s+(dr|doutor|medico|m[eé]dico)/i,
  /\b(quem|sobre)\s+(e|[eé])\s+(o\s+)?(dr|doutor|medico|m[eé]dico)/i,
  /\bqual\s+(a\s+)?experi[eê]ncia\s+(do\s+)?(dr|doutor|medico|m[eé]dico)/i,
  /\bele\s+[eé]\s+bom/i,
  /\bele\s+j[aá]\s+fez/i,
  /\bconhec[eê]r?\s+(melhor\s+)?o\s+(dr|doutor|medico|m[eé]dico)/i,
  /\bapresenta[çc][aã]o\s+(do|dele)/i,
  /\bme\s+conta\s+(um\s+)?pouco\s+(sobre|do|dele)/i,
  /\bele\s+tem\s+experi[eê]ncia/i,
  /\bquantos?\s+anos?\s+de\s+experi[eê]ncia/i,
  /\bforma[çc][aã]o\s+(do\s+)?(dr|doutor|medico|m[eé]dico)/i,
]

export function detectarGatilhoMidia(texto: string): boolean {
  if (!texto) return false
  return GATILHOS.some((re) => re.test(texto))
}
