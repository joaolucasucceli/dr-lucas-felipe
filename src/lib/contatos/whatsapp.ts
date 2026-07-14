import { supabaseAdmin } from "@/lib/supabase"
import type { Database } from "@/lib/types/database"

type ContatoRow = Database["public"]["Tables"]["contatos"]["Row"]

export interface ContatoWhatsappOrdenavel {
  whatsapp: string | null
  tipo: "lead" | "paciente"
  criadoEm?: string | null
}

export function apenasDigitos(valor: string): string {
  return (valor ?? "").replace(/\D+/g, "")
}

export function normalizarNumeroBR(valor: string): string {
  let digitos = apenasDigitos(valor)
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2)
  if (digitos.length === 11 && digitos[2] === "9") {
    digitos = digitos.slice(0, 2) + digitos.slice(3)
  }
  return digitos.slice(-10)
}

export function mesmoNumeroBR(a: string, b: string): boolean {
  const na = normalizarNumeroBR(a)
  const nb = normalizarNumeroBR(b)
  return na.length >= 10 && na === nb
}

export function gerarVariantesWhatsappBR(valor: string): string[] {
  const digitos = apenasDigitos(valor)
  const normalizado = normalizarNumeroBR(digitos)
  const variantes = new Set<string>()

  if (digitos) variantes.add(digitos)

  if (normalizado.length === 10) {
    const comNonoDigito = `${normalizado.slice(0, 2)}9${normalizado.slice(2)}`
    for (const local of [normalizado, comNonoDigito]) {
      variantes.add(local)
      variantes.add(`55${local}`)
    }
  } else if (normalizado) {
    variantes.add(normalizado)
    if (!normalizado.startsWith("55")) variantes.add(`55${normalizado}`)
  }

  return Array.from(variantes).filter(Boolean)
}

export function escolherContatoPrioritario<T extends ContatoWhatsappOrdenavel>(
  contatos: T[],
  whatsappReferencia: string
): T | null {
  const referencia = apenasDigitos(whatsappReferencia)

  return [...contatos].sort((a, b) => {
    if (a.tipo === "paciente" && b.tipo !== "paciente") return -1
    if (a.tipo !== "paciente" && b.tipo === "paciente") return 1

    const aExato = apenasDigitos(a.whatsapp ?? "") === referencia
    const bExato = apenasDigitos(b.whatsapp ?? "") === referencia
    if (aExato && !bExato) return -1
    if (!aExato && bExato) return 1

    return (b.criadoEm ?? "").localeCompare(a.criadoEm ?? "")
  })[0] ?? null
}

export async function buscarContatoAtivoPorWhatsappNormalizado<
  T extends ContatoWhatsappOrdenavel = ContatoRow,
>(whatsapp: string, select = "*") {
  const variantes = gerarVariantesWhatsappBR(whatsapp)
  if (variantes.length === 0) {
    return { contato: null as T | null, error: null, variantes }
  }

  const { data, error } = await supabaseAdmin
    .from("contatos")
    .select(select)
    .in("whatsapp", variantes)
    .is("deletadoEm", null)

  const contatos = (data ?? []) as unknown as T[]

  return {
    contato: error ? null : escolherContatoPrioritario(contatos, whatsapp),
    error,
    variantes,
  }
}
