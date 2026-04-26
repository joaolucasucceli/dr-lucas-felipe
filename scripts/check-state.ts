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
  const { count: totalContatos } = await supabase
    .from("contatos")
    .select("id", { count: "exact", head: true })
    .is("deletadoEm", null)

  const { data: ultimos } = await supabase
    .from("contatos")
    .select("id, nome, whatsapp, tipo, statusFunil, origem, criadoEm")
    .is("deletadoEm", null)
    .order("criadoEm", { ascending: false })
    .limit(5)

  const { count: totalMensagens } = await supabase
    .from("mensagens_whatsapp")
    .select("id", { count: "exact", head: true })

  const { data: ultimasMsgs } = await supabase
    .from("mensagens_whatsapp")
    .select("id, conteudo, remetente, criadoEm, contatoId")
    .order("criadoEm", { ascending: false })
    .limit(3)

  console.log(`\n=== CONTATOS ===`)
  console.log(`Total: ${totalContatos}`)
  console.log(`Ultimos 5:`)
  for (const c of ultimos ?? []) {
    console.log(`  [${c.tipo}] ${c.nome} | ${c.whatsapp} | funil=${c.statusFunil} | origem=${c.origem} | ${c.criadoEm}`)
  }

  console.log(`\n=== MENSAGENS ===`)
  console.log(`Total: ${totalMensagens}`)
  console.log(`Ultimas 3:`)
  for (const m of ultimasMsgs ?? []) {
    const snippet = (m.conteudo || "").slice(0, 60)
    console.log(`  [${m.remetente}] ${snippet} | ${m.criadoEm}`)
  }
}

main().catch(console.error)
