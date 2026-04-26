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
  // Lista FKs da tabela contatos via rpc ou query direta
  const { data, error } = await supabase.rpc("exec_sql" as never, {
    sql: `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'contatos'
        AND tc.constraint_type = 'FOREIGN KEY'
    `,
  } as never)

  if (error) {
    console.log("RPC exec_sql nao existe. Tentando via tabela direto...")

    // Fallback: tentar acessar pg_constraint via admin
    const testes = [
      "contatos_responsavel_id_fkey",
      "contatos_responsavelId_fkey",
      "contatos_responsavelid_fkey",
      "fk_contatos_responsavel",
    ]

    for (const fkName of testes) {
      const { error: err } = await supabase
        .from("contatos")
        .select(`id, responsavel:usuarios!${fkName}(id)`)
        .limit(1)
      console.log(`FK "${fkName}": ${err ? "FALHOU - " + err.message : "OK"}`)
    }

    // Tentar sem hint
    const { error: errSemHint } = await supabase
      .from("contatos")
      .select(`id, responsavel:usuarios(id)`)
      .limit(1)
    console.log(`Sem hint: ${errSemHint ? "FALHOU - " + errSemHint.message : "OK"}`)

    // Tentar com nome de coluna
    const { error: errCol } = await supabase
      .from("contatos")
      .select(`id, responsavel:usuarios!responsavelId(id)`)
      .limit(1)
    console.log(`Por coluna "responsavelId": ${errCol ? "FALHOU - " + errCol.message : "OK"}`)

    return
  }

  console.log(JSON.stringify(data, null, 2))
}

main().catch(console.error)
