/**
 * FONTE ÚNICA das regiões anatômicas do corpo que o sistema reconhece.
 *
 * Antes de 22/07/2026 a lista existia só dentro de `gatilho-handoff.ts`, para
 * decidir transbordo. Quando o Dr. Lucas pediu preço por região (22/07/2026),
 * ficou claro que a mesma lista precisa servir a três consumidores: o detector
 * de handoff, o cadastro de preços do dashboard e o resumo de caso enviado a
 * ele. Duplicar a lista era repetir exatamente o erro que gerou a estimativa
 * genérica — uma verdade escrita em dois lugares que divergem com o tempo.
 *
 * Para adicionar uma região nova, edite APENAS `REGIOES_CORPO`.
 */

export interface RegiaoCorpo {
  /** Chave estável usada no banco (`procedimento_regioes.regiao`). */
  chave: string
  /** Como aparece para humanos no dashboard e no resumo do Dr. Lucas. */
  rotulo: string
  /** Como o paciente escreve — usado para casar a fala dele com a região. */
  padrao: RegExp
  /**
   * Faz parte dos combos padrão do Programa Paciente Modelo (abdome, flancos,
   * glúteo). Regiões fora disso, quando o paciente pede valor, disparam
   * handoff para o Dr. Lucas em vez de resposta automática.
   */
  noProgramaPacienteModelo: boolean
}

export const REGIOES_CORPO: readonly RegiaoCorpo[] = [
  {
    chave: "abdome",
    rotulo: "Abdome",
    padrao: /\babd[oô]m|\bbarriga\b/i,
    noProgramaPacienteModelo: true,
  },
  {
    chave: "flancos",
    rotulo: "Flancos",
    padrao: /\bflancos?\b|\bcintura\b/i,
    noProgramaPacienteModelo: true,
  },
  {
    chave: "gluteo",
    rotulo: "Glúteo",
    padrao: /\bgl[uú]teos?\b|\bbumbum\b/i,
    noProgramaPacienteModelo: true,
  },
  {
    chave: "bracos",
    rotulo: "Braços",
    padrao: /\bbra[çc]os?\b/i,
    noProgramaPacienteModelo: false,
  },
  {
    chave: "costas",
    rotulo: "Costas",
    padrao: /\bcostas\b/i,
    noProgramaPacienteModelo: false,
  },
  {
    chave: "coxas",
    rotulo: "Coxas",
    padrao: /\bcoxas?\b/i,
    noProgramaPacienteModelo: false,
  },
  {
    chave: "culote",
    rotulo: "Culote",
    padrao: /\bculote\b/i,
    noProgramaPacienteModelo: false,
  },
  {
    chave: "papada",
    rotulo: "Papada",
    padrao: /\bpapada\b|\bj[oô]w?l\b/i,
    noProgramaPacienteModelo: false,
  },
  {
    chave: "mamas",
    rotulo: "Mamas",
    padrao: /\bmamas?\b|\bpeito\b/i,
    noProgramaPacienteModelo: false,
  },
  {
    chave: "pernas",
    rotulo: "Pernas",
    padrao: /\bpernas?\b/i,
    noProgramaPacienteModelo: false,
  },
  {
    chave: "axilas",
    rotulo: "Axilas",
    padrao: /\baxilas?\b/i,
    noProgramaPacienteModelo: false,
  },
]

export const CHAVES_REGIAO = REGIOES_CORPO.map((r) => r.chave)

export function rotuloRegiao(chave: string): string {
  return REGIOES_CORPO.find((r) => r.chave === chave)?.rotulo ?? chave
}

/** Todas as regiões citadas num texto do paciente. */
export function extrairRegioesDoTexto(texto: string): {
  chaves: string[]
  temRegiaoForaDoProgramaModelo: boolean
} {
  const chaves: string[] = []
  let temRegiaoForaDoProgramaModelo = false

  for (const regiao of REGIOES_CORPO) {
    if (regiao.padrao.test(texto)) {
      chaves.push(regiao.chave)
      if (!regiao.noProgramaPacienteModelo) temRegiaoForaDoProgramaModelo = true
    }
  }

  return { chaves, temRegiaoForaDoProgramaModelo }
}
