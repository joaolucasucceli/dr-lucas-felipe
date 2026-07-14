export type NivelAlerta = "normal" | "atencao" | "critico"

interface LimiteConfig {
  unidade: string
  avaliar: (valor: string) => NivelAlerta
}

function parsePressao(valor: string): { sistolica: number; diastolica: number } | null {
  const partes = valor.split("/")
  if (partes.length !== 2) return null
  const sistolica = parseFloat(partes[0])
  const diastolica = parseFloat(partes[1])
  if (isNaN(sistolica) || isNaN(diastolica)) return null
  return { sistolica, diastolica }
}

function parseNumero(valor: string): number | null {
  const num = parseFloat(valor.replace(",", "."))
  return isNaN(num) ? null : num
}

const configuracoes: Record<string, LimiteConfig> = {
  pressao_arterial: {
    unidade: "mmHg",
    avaliar: (valor) => {
      const pa = parsePressao(valor)
      if (!pa) return "normal"
      if (pa.sistolica >= 140 || pa.diastolica >= 90) return "critico"
      if (pa.sistolica >= 131 || pa.diastolica >= 86) return "atencao"
      if (pa.sistolica < 90 || pa.diastolica < 60) return "atencao"
      return "normal"
    },
  },
  frequencia_cardiaca: {
    unidade: "bpm",
    avaliar: (valor) => {
      const num = parseNumero(valor)
      if (num === null) return "normal"
      if (num < 50 || num > 120) return "critico"
      if (num < 60 || num > 100) return "atencao"
      return "normal"
    },
  },
  temperatura: {
    unidade: "°C",
    avaliar: (valor) => {
      const num = parseNumero(valor)
      if (num === null) return "normal"
      if (num > 38.5 || num < 35) return "critico"
      if (num > 37.5 || num < 36) return "atencao"
      return "normal"
    },
  },
  saturacao_o2: {
    unidade: "%",
    avaliar: (valor) => {
      const num = parseNumero(valor)
      if (num === null) return "normal"
      if (num < 90) return "critico"
      if (num < 95) return "atencao"
      return "normal"
    },
  },
  glicemia: {
    unidade: "mg/dL",
    avaliar: (valor) => {
      const num = parseNumero(valor)
      if (num === null) return "normal"
      if (num < 70 || num > 200) return "critico"
      if (num > 100) return "atencao"
      return "normal"
    },
  },
}

export function avaliarSinalVital(tipo: string, valor: string): NivelAlerta {
  const config = configuracoes[tipo]
  if (!config) return "normal"
  return config.avaliar(valor)
}

export function obterUnidade(tipo: string): string {
  return configuracoes[tipo]?.unidade || ""
}

export const labelsTipo: Record<string, string> = {
  pressao_arterial: "Pressão Arterial",
  frequencia_cardiaca: "Freq. Cardíaca",
  temperatura: "Temperatura",
  saturacao_o2: "SpO₂",
  glicemia: "Glicemia",
}

export const placeholderTipo: Record<string, string> = {
  pressao_arterial: "120/80",
  frequencia_cardiaca: "72",
  temperatura: "36.5",
  saturacao_o2: "98",
  glicemia: "90",
}
