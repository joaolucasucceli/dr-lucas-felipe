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

const probes: { tabela: string; fk: string; alvo: string; hint: string }[] = [
  { tabela: "contatos", fk: "contatos_responsavelId_fkey", alvo: "usuarios", hint: "id" },
  { tabela: "agendamentos", fk: "agendamentos_contatoId_fkey", alvo: "contatos", hint: "id" },
  { tabela: "conversas", fk: "conversas_contatoId_fkey", alvo: "contatos", hint: "id" },
  { tabela: "mensagens_whatsapp", fk: "mensagens_whatsapp_contatoId_fkey", alvo: "contatos", hint: "id" },
  { tabela: "fotos_contato", fk: "fotos_contato_contatoId_fkey", alvo: "contatos", hint: "id" },
  { tabela: "prontuarios", fk: "prontuarios_contatoId_fkey", alvo: "contatos", hint: "id" },
  { tabela: "analista_logs", fk: "analista_logs_contatoId_fkey", alvo: "contatos", hint: "id" },
]

async function main() {
  for (const p of probes) {
    const { error } = await supabase
      .from(p.tabela)
      .select(`id, alvo:${p.alvo}!${p.fk}(${p.hint})`)
      .limit(1)

    // Tambem tenta versao lowercase
    const fkLower = p.fk.toLowerCase()
    const { error: errLower } = await supabase
      .from(p.tabela)
      .select(`id, alvo:${p.alvo}!${fkLower}(${p.hint})`)
      .limit(1)

    console.log(`${p.tabela}.${p.fk}: ${error ? "❌" : "✓"}  |  lowercase ${fkLower}: ${errLower ? "❌" : "✓"}`)
  }
}

main().catch(console.error)
