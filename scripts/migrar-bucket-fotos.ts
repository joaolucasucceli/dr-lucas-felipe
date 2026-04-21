/**
 * JLAU-607 — Migrar bucket Supabase Storage fotos-leads -> fotos-contatos.
 *
 * Executa em 4 passos idempotentes:
 *   1) Garante que o bucket `fotos-contatos` existe (cria com mesmo visibility do antigo)
 *   2) Lista todos arquivos em `fotos-leads` (recursivo por pasta do contatoId)
 *   3) Copia cada arquivo que ainda nao existir em `fotos-contatos` mesmo path
 *   4) Atualiza URLs em `fotos_contato.url` trocando `/fotos-leads/` -> `/fotos-contatos/`
 *
 * Idempotente: pode rodar varias vezes. So copia o que falta. So atualiza URL
 * que ainda aponta pro bucket antigo.
 *
 * NAO deleta o bucket antigo. Faca isso manual no Supabase Studio apos validar
 * em producao que upload/visualizacao de fotos novas funciona.
 *
 * Uso:
 *   npx tsx scripts/migrar-bucket-fotos.ts
 *
 * Requer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no .env.local
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

const BUCKET_ANTIGO = "fotos-leads"
const BUCKET_NOVO = "fotos-contatos"

function sanear(v: string): string {
  // Remove aspas de wrap + \r, \n (literais ou escapados) + trim
  // (vercel env add via echo persiste o newline final no valor)
  return v.replace(/^["']|["']$/g, "").replace(/\\n|\\r|\r|\n/g, "").trim()
}

function carregarEnv() {
  for (const nome of [".env.local", ".env.production.local", ".env.production"]) {
    const envPath = resolve(process.cwd(), nome)
    try {
      const raw = readFileSync(envPath, "utf-8")
      for (const linha of raw.split(/\r?\n/)) {
        const match = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (!match) continue
        const [, chave, valor] = match
        if (!process.env[chave]) {
          process.env[chave] = sanear(valor)
        }
      }
    } catch {
      // arquivo pode nao existir — tenta o proximo
    }
  }
}

carregarEnv()

const url = sanear(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "")
const serviceKey = sanear(process.env.SUPABASE_SERVICE_ROLE_KEY || "")

if (!url || !serviceKey) {
  console.error(
    "[migrar-bucket] Faltando NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY."
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function garantirBucketNovo(publico: boolean) {
  const { data: buckets } = await supabase.storage.listBuckets()
  const existe = buckets?.some((b) => b.name === BUCKET_NOVO)
  if (existe) {
    console.log(`[migrar-bucket] Bucket "${BUCKET_NOVO}" ja existe.`)
    return
  }
  const { error } = await supabase.storage.createBucket(BUCKET_NOVO, {
    public: publico,
  })
  if (error) {
    throw new Error(`Falha ao criar bucket novo: ${error.message}`)
  }
  console.log(
    `[migrar-bucket] Bucket "${BUCKET_NOVO}" criado (publico=${publico}).`
  )
}

async function descobrirVisibilidadeAntiga(): Promise<boolean> {
  const { data: buckets } = await supabase.storage.listBuckets()
  const antigo = buckets?.find((b) => b.name === BUCKET_ANTIGO)
  if (!antigo) {
    throw new Error(`Bucket antigo "${BUCKET_ANTIGO}" nao encontrado.`)
  }
  return antigo.public === true
}

interface ArquivoAMigrar {
  pathCompleto: string
  contatoId: string
  nomeArquivo: string
}

async function listarArquivosRecursivo(
  bucket: string
): Promise<ArquivoAMigrar[]> {
  const arquivos: ArquivoAMigrar[] = []

  const { data: pastas, error } = await supabase.storage
    .from(bucket)
    .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } })

  if (error) {
    throw new Error(`Falha ao listar raiz de ${bucket}: ${error.message}`)
  }

  for (const item of pastas ?? []) {
    if (!item.name) continue
    // Pastas nao tem id, arquivos tem id
    if (item.id) {
      arquivos.push({
        pathCompleto: item.name,
        contatoId: "",
        nomeArquivo: item.name,
      })
      continue
    }

    const contatoId = item.name
    const { data: arquivosContato, error: errPasta } = await supabase.storage
      .from(bucket)
      .list(contatoId, { limit: 1000 })

    if (errPasta) {
      console.warn(
        `[migrar-bucket] Falha ao listar pasta ${contatoId}: ${errPasta.message}`
      )
      continue
    }

    for (const f of arquivosContato ?? []) {
      if (!f.name) continue
      arquivos.push({
        pathCompleto: `${contatoId}/${f.name}`,
        contatoId,
        nomeArquivo: f.name,
      })
    }
  }

  return arquivos
}

async function copiarArquivo(path: string): Promise<"copiado" | "ja-existe" | "erro"> {
  const existe = await supabase.storage
    .from(BUCKET_NOVO)
    .list(path.split("/")[0] || "", { search: path.split("/").pop() })
  if (existe.data?.some((f) => `${path.split("/")[0]}/${f.name}` === path || f.name === path)) {
    return "ja-existe"
  }

  const { data: arquivo, error: errDownload } = await supabase.storage
    .from(BUCKET_ANTIGO)
    .download(path)

  if (errDownload || !arquivo) {
    console.warn(`[migrar-bucket] Falha download "${path}": ${errDownload?.message}`)
    return "erro"
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer())
  const { error: errUpload } = await supabase.storage
    .from(BUCKET_NOVO)
    .upload(path, buffer, {
      contentType: arquivo.type || undefined,
      upsert: false,
    })

  if (errUpload) {
    if (errUpload.message.includes("already exists") || errUpload.message.includes("resource already exists")) {
      return "ja-existe"
    }
    console.warn(`[migrar-bucket] Falha upload "${path}": ${errUpload.message}`)
    return "erro"
  }

  return "copiado"
}

async function atualizarUrls() {
  // Paginacao manual para nao estourar limite
  const PAGE = 500
  let offset = 0
  let atualizadas = 0
  let skipped = 0

  while (true) {
    const { data, error } = await supabase
      .from("fotos_contato")
      .select("id, url")
      .not("url", "is", null)
      .ilike("url", `%/${BUCKET_ANTIGO}/%`)
      .range(offset, offset + PAGE - 1)

    if (error) {
      throw new Error(`Falha ao buscar URLs: ${error.message}`)
    }
    if (!data || data.length === 0) break

    for (const foto of data) {
      if (!foto.url) {
        skipped++
        continue
      }
      const novaUrl = foto.url.replaceAll(`/${BUCKET_ANTIGO}/`, `/${BUCKET_NOVO}/`)
      if (novaUrl === foto.url) {
        skipped++
        continue
      }
      const { error: errUpdate } = await supabase
        .from("fotos_contato")
        .update({ url: novaUrl })
        .eq("id", foto.id)
      if (errUpdate) {
        console.warn(`[migrar-bucket] Falha update foto ${foto.id}: ${errUpdate.message}`)
        continue
      }
      atualizadas++
    }

    if (data.length < PAGE) break
    offset += PAGE
  }

  console.log(
    `[migrar-bucket] URLs em fotos_contato: ${atualizadas} atualizadas, ${skipped} ignoradas.`
  )
}

async function main() {
  console.log(`[migrar-bucket] Inicio. Supabase URL: ${url}`)

  const antigoEPublico = await descobrirVisibilidadeAntiga()
  console.log(`[migrar-bucket] Bucket antigo publico=${antigoEPublico}`)

  await garantirBucketNovo(antigoEPublico)

  const arquivos = await listarArquivosRecursivo(BUCKET_ANTIGO)
  console.log(`[migrar-bucket] ${arquivos.length} arquivo(s) em "${BUCKET_ANTIGO}".`)

  if (arquivos.length === 0) {
    console.log(`[migrar-bucket] Nenhum arquivo para migrar. Prosseguindo para URLs.`)
  } else {
    let copiados = 0
    let jaExistiam = 0
    let erros = 0
    for (const arq of arquivos) {
      const resultado = await copiarArquivo(arq.pathCompleto)
      if (resultado === "copiado") copiados++
      else if (resultado === "ja-existe") jaExistiam++
      else erros++
    }
    console.log(
      `[migrar-bucket] Arquivos: ${copiados} copiados, ${jaExistiam} ja existiam, ${erros} erros.`
    )
  }

  await atualizarUrls()

  console.log(`[migrar-bucket] Concluido com sucesso.`)
  console.log(``)
  console.log(`Proximos passos:`)
  console.log(` 1) Commit atualizando BUCKET_FOTOS_CONTATO = "${BUCKET_NOVO}" em lib/contatos/constantes.ts`)
  console.log(` 2) Push + deploy`)
  console.log(` 3) Validar upload/download de foto nova no painel`)
  console.log(` 4) Deletar bucket "${BUCKET_ANTIGO}" no Supabase Studio apos confirmar`)
}

main().catch((err) => {
  console.error(`[migrar-bucket] ERRO:`, err instanceof Error ? err.message : err)
  process.exit(1)
})
