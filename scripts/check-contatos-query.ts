import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

function sanear(v: string): string {
  return v.replace(/^["']|["']$/g, "").replace(/\\n|\\r|\r|\n/g, "").trim()
}

for (const nome of [".env.local", ".env.production.local", ".env.production"]) {
  try {
    const raw = readFileSync(resolve(process.cwd(), nome), "utf-8")
    for (const linha of raw.split(/\r?\n/)) {
      const m = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (!m) continue
      const [, k, v] = m
      if (!process.env[k]) process.env[k] = sanear(v)
    }
  } catch {}
}

const supabase = createClient(
  sanear(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
  sanear(process.env.SUPABASE_SERVICE_ROLE_KEY || "")
)

async function main() {
  // Mesma query que /api/contatos GET faz
  const SELECT_CONTATO =
    "id, tipo, nome, whatsapp, email, procedimentoInteresse, statusFunil, origem, arquivado, cpf, criadoEm, promovidoEm, responsavel:usuarios!contatos_responsavelId_fkey(id, nome)"

  console.log("\n=== query sem filtros ===")
  const { data, count, error } = await supabase
    .from("contatos")
    .select(SELECT_CONTATO, { count: "exact" })
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .order("criadoEm", { ascending: false })
    .range(0, 9)

  console.log(`count=${count}`)
  if (error) console.error("ERRO:", error)
  else console.log("data:", JSON.stringify(data, null, 2))

  console.log("\n=== query com tipo=lead (como atendente ve) ===")
  const { data: leads, count: cLeads, error: eLeads } = await supabase
    .from("contatos")
    .select(SELECT_CONTATO, { count: "exact" })
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .eq("tipo", "lead")
    .order("criadoEm", { ascending: false })
    .range(0, 9)
  console.log(`count=${cLeads}`)
  if (eLeads) console.error("ERRO:", eLeads)
  else console.log(`${leads?.length} leads`)

  console.log("\n=== query com tipo=paciente ===")
  const { data: pac, count: cPac, error: ePac } = await supabase
    .from("contatos")
    .select(SELECT_CONTATO, { count: "exact" })
    .is("deletadoEm", null)
    .eq("arquivado", false)
    .eq("tipo", "paciente")
    .order("criadoEm", { ascending: false })
    .range(0, 9)
  console.log(`count=${cPac}`)
  if (ePac) console.error("ERRO:", ePac)
  else console.log(`${pac?.length} pacientes`)
}

main().catch(console.error)
