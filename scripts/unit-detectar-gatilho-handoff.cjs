/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Teste unitario do detectarGatilhoHandoff — duplica os regex de
 * lib/agente/gatilho-handoff.ts em JS puro pra rodar fora do bundler do Next.
 * Se ficar fora de sync com o .ts → editar AMBOS.
 */

const PERGUNTA_VALOR = [
  /\bquanto\s+(custa|fica|sai|[ée])\b/i,
  /\bqual\s+(o\s+)?(valor|pre[çc]o|custo)\b/i,
  /\bme\s+(passa|passe|d[áa]|diz|fala|manda)\s+(o\s+)?(valor|pre[çc]o)\b/i,
  /\bvalor\s+(exato|certo|certinho|d[ao]|de)\b/i,
  /\bpre[çc]o\s+(exato|certo|certinho|d[ao]|de)\b/i,
  /\b(passa|passe|me\s+manda)\s+o\s+(valor|pre[çc]o)\b/i,
  /\bcusto\s+d[aoe]\b/i,
  /\bor[çc]amento\s+(d[aoe]|exato|certo|para|pra)\b/i,
]

const FORA_DO_PADRAO = [
  /\bfora\s+(do|de)\s+(paciente\s+modelo|programa(\s+paciente)?|combo|padr[ãa]o)\b/i,
  /\bsem\s+(o\s+)?(programa|paciente\s+modelo)\b/i,
  /\bn[ãa]o\s+quero\s+(o\s+)?(paciente\s+modelo|programa)\b/i,
]

const COMPARACAO_EXTERNA = [
  /\bvi\s+outr[ao]/i,
  /\boutras?\s+cl[ií]nicas?\b/i,
  /\boutro\s+lugar\b/i,
  /\bem\s+outra\s+cl[ií]nica\b/i,
  /\bcobrand?o?\s+r\$\s*\d/i,
]

const URGENCIA = [
  /\bdecidir\s+(hoje|agora)\b/i,
  /\bhoje\s+mesmo\b/i,
  /\bpreciso\s+(saber\s+)?agora\b/i,
  /\burgent[ei]\b/i,
  /\bme\s+passa?\s+r[áa]pido\b/i,
]

const REGIAO_PATTERNS = [
  { re: /\babd[oô]m/i, canonica: "abdome", foraPM: false },
  { re: /\bbarriga\b/i, canonica: "abdome", foraPM: false },
  { re: /\bflancos?\b/i, canonica: "flancos", foraPM: false },
  { re: /\bcintura\b/i, canonica: "flancos", foraPM: false },
  { re: /\bgl[uú]teos?\b/i, canonica: "gluteo", foraPM: false },
  { re: /\bbumbum\b/i, canonica: "gluteo", foraPM: false },
  { re: /\bbra[çc]os?\b/i, canonica: "bracos", foraPM: true },
  { re: /\bcostas\b/i, canonica: "costas", foraPM: true },
  { re: /\bcoxas?\b/i, canonica: "coxas", foraPM: true },
  { re: /\bculote\b/i, canonica: "culote", foraPM: true },
  { re: /\bpapada\b/i, canonica: "papada", foraPM: true },
  { re: /\bmamas?\b/i, canonica: "mamas", foraPM: true },
  { re: /\bpeito\b/i, canonica: "mamas", foraPM: true },
  { re: /\bpernas?\b/i, canonica: "pernas", foraPM: true },
  { re: /\baxilas?\b/i, canonica: "axilas", foraPM: true },
  { re: /\bj[oô]w?l\b/i, canonica: "papada", foraPM: true },
]

function extrairRegioes(texto) {
  const todas = new Set()
  let contemForaPM = false
  for (const { re, canonica, foraPM } of REGIAO_PATTERNS) {
    if (re.test(texto)) {
      todas.add(canonica)
      if (foraPM) contemForaPM = true
    }
  }
  return { todas, contemForaPM }
}

function ehComboPacienteModelo(regioes) {
  if (regioes.size === 1) return regioes.has("abdome")
  if (regioes.size === 2) return regioes.has("abdome") && regioes.has("flancos")
  if (regioes.size === 3)
    return regioes.has("abdome") && regioes.has("flancos") && regioes.has("gluteo")
  return false
}

function detectarGatilhoHandoff(texto) {
  if (!texto) return false
  const pediuValor = PERGUNTA_VALOR.some((re) => re.test(texto))
  if (!pediuValor) return false
  const { todas, contemForaPM } = extrairRegioes(texto)
  const multiRegiaoForaCombo = todas.size >= 2 && !ehComboPacienteModelo(todas)
  const foraDoPadrao = FORA_DO_PADRAO.some((re) => re.test(texto))
  const comparacaoExterna = COMPARACAO_EXTERNA.some((re) => re.test(texto))
  const urgencia = URGENCIA.some((re) => re.test(texto))
  return (
    multiRegiaoForaCombo ||
    contemForaPM ||
    foraDoPadrao ||
    comparacaoExterna ||
    urgencia
  )
}

const casos = [
  {
    nome: "Combo fora do PM + comparação externa + urgência (caso piloto teste #6)",
    texto:
      "Oi! Já te mandei as fotos do meu abdome + flancos + braços. Quero fazer lipo nas 3 regiões juntas (sem o programa paciente modelo). Já vi outras clínicas cobrando R$ 25.000 nesse combo completo. Me passa o valor EXATO do Dr. Lucas pra eu decidir hoje?",
    esperado: true,
  },
  {
    nome: "Multi-região fora do combo PM (abdome + braços)",
    texto: "Quanto custa lipo de abdome + braços?",
    esperado: true,
  },
  {
    nome: "Lipo de braço (região fora do PM, singular)",
    texto: "Quanto fica lipo de braço?",
    esperado: true,
  },
  {
    nome: "Papada (região fora do PM)",
    texto: "Qual o valor da papada?",
    esperado: true,
  },
  {
    nome: "Comparação externa de preço",
    texto: "Vi outras clínicas cobrando 20 mil. Quanto custa aqui?",
    esperado: true,
  },
  {
    nome: "Urgência declarada",
    texto: "Quanto custa? Preciso decidir hoje.",
    esperado: true,
  },
  {
    nome: 'Frase "fora do paciente modelo"',
    texto: "Qual o valor da lipo fora do paciente modelo?",
    esperado: true,
  },
  {
    nome: "Abdome sozinho (PM combo 1) — NÃO deve disparar",
    texto: "Quanto custa abdome?",
    esperado: false,
  },
  {
    nome: "Abdome + flancos (PM combo 2) — NÃO deve disparar",
    texto: "Quanto fica abdome + flancos?",
    esperado: false,
  },
  {
    nome: "Abdome + flancos + glúteo (PM combo 3) — NÃO deve disparar",
    texto: "Qual o preço de abdome + flancos + glúteo?",
    esperado: false,
  },
  {
    nome: "Nenhuma pergunta de valor — NÃO deve disparar",
    texto: "Oi tudo bem? Quero conhecer o Dr. Lucas",
    esperado: false,
  },
  {
    nome: "Pergunta sobre procedimento sem valor — NÃO deve disparar",
    texto: "Vocês fazem lipo de braço?",
    esperado: false,
  },
  {
    nome: "Mensagem vazia",
    texto: "",
    esperado: false,
  },
]

let passou = 0
let falhou = 0

for (const caso of casos) {
  const obtido = detectarGatilhoHandoff(caso.texto)
  const ok = obtido === caso.esperado
  if (ok) passou++
  else falhou++
  console.log(`${ok ? "🟢" : "🔴"} ${caso.nome} — esperado=${caso.esperado} obtido=${obtido}`)
  if (!ok) console.log(`     mensagem: "${caso.texto.slice(0, 120)}"`)
}

console.log(`\nResultado: ${passou}/${casos.length} ${falhou === 0 ? "🟢" : "🔴 " + falhou + " falharam"}`)
process.exit(falhou === 0 ? 0 : 1)
