/**
 * Detecta gatilhos de conteudo/midia no texto do paciente.
 *
 * Gatilho visual: paciente pediu foto, video, antes/depois ou prova social.
 * Gatilho de procedimento: paciente mencionou procedimento/regiao e a IA deve
 * carregar contexto/midia para ancorar valor, sem necessariamente enviar antes
 * do acolhimento correto.
 */
const GATILHOS_VISUAIS: RegExp[] = [
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

  // Apresentacao do Dr. Lucas.
  /\bme\s+fala\s+(do|sobre\s+o)\s+(dr|doutor|medico|m[eé]dico)/i,
  /\bquem\s+[eé]\s+(o\s+)?(dr|doutor|medico|m[eé]dico)/i,
  /\bqual\s+(a\s+)?experi[eê]ncia\s+(do\s+)?(dr|doutor|medico|m[eé]dico)/i,
  /\bconhec[eê]r?\s+(melhor\s+)?o\s+(dr|doutor|medico|m[eé]dico)/i,
  /\bapresenta[çc][aã]o\s+(do\s+(dr|doutor|medico|m[eé]dico)|dele\b)/i,
  /\bme\s+conta\s+(um\s+)?pouco\s+(sobre\s+(ele|o\s+(dr|doutor|medico|m[eé]dico))|do\s+(dr|doutor|medico|m[eé]dico)|dele\b)/i,
  /\bele\s+tem\s+experi[eê]ncia/i,
  /\bquantos?\s+anos?\s+de\s+experi[eê]ncia/i,
  /\bforma[çc][aã]o\s+(do\s+)?(dr|doutor|medico|m[eé]dico)/i,
]

const GATILHOS_PROCEDIMENTO: RegExp[] = [
  /\bmini\s*lipo\b/i,
  /\bminilipo\b/i,
  /\blipo\b/i,
  /\blipoaspira[çc][aã]o\b/i,
  /\bhidrolipo\b/i,
  /\blipo\s*fit\b/i,
  /\blipo\s*butt\b/i,
  /\bpaciente\s+modelo\b/i,
  /\babd[oô]m(en|e)\b/i,
  /\bbarriga\b/i,
  /\bflancos?\b/i,
  /\bpapada\b/i,
  /\bculote\b/i,
  /\baxila\b/i,
  /\benxerto\s+gl[uú]teo\b/i,
]

export function detectarGatilhoVisualMidia(texto: string): boolean {
  if (!texto) return false
  return GATILHOS_VISUAIS.some((re) => re.test(texto))
}

export function detectarGatilhoProcedimentoMidia(texto: string): boolean {
  if (!texto) return false
  return GATILHOS_PROCEDIMENTO.some((re) => re.test(texto))
}

export function detectarGatilhoMidia(texto: string): boolean {
  return detectarGatilhoVisualMidia(texto) || detectarGatilhoProcedimentoMidia(texto)
}
