import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

function sanear(v: string): string {
  // Trim + remove \r, \n literais (escapados ou reais) e aspas de wrap
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
  } catch {
    // arquivo pode nao existir
  }
}

const url = sanear(process.env.NEXT_PUBLIC_SUPABASE_URL || "")
const key = sanear(process.env.SUPABASE_SERVICE_ROLE_KEY || "")
console.log("URL:", JSON.stringify(url))

const supabase = createClient(url, key)

async function main() {
  const { data, error } = await supabase.storage.listBuckets()
  if (error) {
    console.error("Erro listBuckets:", error.message)
    return
  }
  console.log("Buckets:", JSON.stringify(data, null, 2))

  const { count, error: errFotos } = await supabase
    .from("fotos_contato")
    .select("id", { count: "exact", head: true })
  if (errFotos) {
    console.error("Erro fotos_contato count:", errFotos.message)
    return
  }
  console.log("Total de registros em fotos_contato:", count)

  const { data: amostra } = await supabase
    .from("fotos_contato")
    .select("id, url")
    .not("url", "is", null)
    .limit(3)
  console.log("Amostra de URLs:", JSON.stringify(amostra, null, 2))
}

main().catch((e) => {
  console.error("Falha:", e)
  process.exit(1)
})
