/**
 * Migration 2026-05-13 — adicionar valor + ofertas paciente modelo
 *
 * Aplica:
 *   1) ALTER TABLE procedimentos: adiciona valorEstimadoBrl, valorCheioBrl, parcelamento, escopoOferta
 *   2) INSERT 3 registros de ofertas paciente modelo do tráfego pago
 *
 * Uso:
 *   npx tsx scripts/migration-valor-procedimentos-2026-05-13.ts
 *
 * Lê DATABASE_URL de .env.tmp.local (criada via `vercel env pull`).
 */

import { Client } from "pg"
import { readFileSync } from "fs"
import { resolve } from "path"

function carregarEnv() {
  for (const nome of [".env.tmp.local", ".env.local", ".env.production.local"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), nome), "utf-8")
      for (const linha of raw.split(/\r?\n/)) {
        const m = linha.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/)
        if (!m) continue
        const [, k, v] = m
        if (!process.env[k]) process.env[k] = v.trim()
      }
    } catch {
      // arquivo pode nao existir
    }
  }
}

carregarEnv()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Faltando DATABASE_URL — rodar `vercel env pull .env.tmp.local --environment=production` antes")
  process.exit(1)
}

async function main() {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log("[migration] Conectado ao banco do Dr. Lucas\n")

  try {
    await client.query("BEGIN")

    // 1) ALTER TABLE — adicionar colunas
    console.log("[1/3] ALTER TABLE procedimentos — adicionando colunas...")
    await client.query(`
      ALTER TABLE procedimentos
        ADD COLUMN IF NOT EXISTS "valorEstimadoBrl" numeric(10,2),
        ADD COLUMN IF NOT EXISTS "valorCheioBrl" numeric(10,2),
        ADD COLUMN IF NOT EXISTS "parcelamento" text,
        ADD COLUMN IF NOT EXISTS "escopoOferta" text
    `)
    console.log("       ✅ Colunas adicionadas\n")

    // 2) INSERT — 3 ofertas paciente modelo
    console.log("[2/3] Inserindo 3 ofertas paciente modelo...")
    const ofertas = [
      {
        id: "proc-oferta-pm-mini-lipo-completa",
        nome: "Mini Lipo Paciente Modelo — Abdome + Flancos + Enxerto Glúteo",
        tipo: "Cirúrgico",
        descricao: `**O que é**

Combo do Programa Paciente Modelo, ofertado nos anúncios do Instagram. Pacote completo de Mini Lipo Fracionada nas regiões abdome e flancos, com enxerto de gordura nos glúteos.

**Escopo da oferta**

- Lipoaspiração fracionada em abdome (frente)
- Lipoaspiração fracionada em flancos (laterais)
- Enxerto glúteo (gordura própria reaproveitada)

**Condição comercial Paciente Modelo**

R$ 13.000 (até 12× no cartão). Valor cheio (sem programa): R$ 20.000.

Em troca do desconto, paciente autoriza uso de imagem + participa de registros pré/trans/pós + dá depoimento espontâneo.

**Incluso**

- Procedimento ambulatorial com segurança e conforto
- Acompanhamento especializado do Dr. Lucas
- 3 retornos pós-operatórios (1 mês, 3 meses, 6 meses)
- Correções caso necessário

**Como funciona**

Detalhes técnicos do procedimento, recuperação esperada e expectativa de resultado idênticos ao [Lipo + Enxerto Glúteo] e à [Mini Lipo (Lipo Fracionada)] — ver descrição completa nesses procedimentos.`,
        duracaoMin: 240,
        posOperatorio: "Mesmos cuidados do procedimento [Lipo + Enxerto Glúteo].",
        valorEstimadoBrl: 13000,
        valorCheioBrl: 20000,
        parcelamento: "até 12× no cartão",
        escopoOferta: "Abdome + Flancos + Enxerto Glúteo",
      },
      {
        id: "proc-oferta-pm-abdome-flancos-sem-enxerto",
        nome: "Mini Lipo Paciente Modelo — Abdome + Flancos (sem enxerto)",
        tipo: "Minimamente Invasivo",
        descricao: `**O que é**

Combo do Programa Paciente Modelo, ofertado nos anúncios do Instagram. Mini Lipo Fracionada em abdome e flancos, **sem enxerto glúteo**.

**Escopo da oferta**

- Lipoaspiração fracionada em abdome (frente)
- Lipoaspiração fracionada em flancos (laterais)

**Condição comercial Paciente Modelo**

R$ 10.700.

Em troca do desconto, paciente autoriza uso de imagem + participa de registros pré/trans/pós + dá depoimento espontâneo.

**Incluso**

- Procedimento ambulatorial com segurança e conforto
- Acompanhamento especializado do Dr. Lucas
- 3 retornos pós-operatórios (1 mês, 3 meses, 6 meses)
- Correções caso necessário

**Como funciona**

Mesma técnica e recuperação da [Mini Lipo (Lipo Fracionada)] — ver descrição completa lá.`,
        duracaoMin: 180,
        posOperatorio: "Mesmos cuidados da [Mini Lipo (Lipo Fracionada)].",
        valorEstimadoBrl: 10700,
        valorCheioBrl: null,
        parcelamento: null,
        escopoOferta: "Abdome + Flancos (sem enxerto)",
      },
      {
        id: "proc-oferta-pm-so-abdome",
        nome: "Mini Lipo Paciente Modelo — Só Abdome",
        tipo: "Minimamente Invasivo",
        descricao: `**O que é**

Combo do Programa Paciente Modelo, ofertado nos anúncios do Instagram. Mini Lipo Fracionada **só no abdome** (frente).

**Escopo da oferta**

- Lipoaspiração fracionada em abdome (frente)

**Condição comercial Paciente Modelo**

R$ 8.500.

Em troca do desconto, paciente autoriza uso de imagem + participa de registros pré/trans/pós + dá depoimento espontâneo.

**Incluso**

- Procedimento ambulatorial com segurança e conforto
- Acompanhamento especializado do Dr. Lucas
- 3 retornos pós-operatórios (1 mês, 3 meses, 6 meses)
- Correções caso necessário

**Como funciona**

Mesma técnica e recuperação da [Mini Lipo (Lipo Fracionada)] — ver descrição completa lá.`,
        duracaoMin: 150,
        posOperatorio: "Mesmos cuidados da [Mini Lipo (Lipo Fracionada)].",
        valorEstimadoBrl: 8500,
        valorCheioBrl: null,
        parcelamento: null,
        escopoOferta: "Só Abdome",
      },
    ]

    for (const o of ofertas) {
      const r = await client.query(
        `INSERT INTO procedimentos
           (id, nome, tipo, descricao, "duracaoMin", "posOperatorio", ativo,
            "valorEstimadoBrl", "valorCheioBrl", parcelamento, "escopoOferta",
            "criadoEm", "atualizadoEm")
         VALUES ($1, $2, $3, $4, $5, $6, true,
                 $7, $8, $9, $10,
                 NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           nome = EXCLUDED.nome,
           tipo = EXCLUDED.tipo,
           descricao = EXCLUDED.descricao,
           "duracaoMin" = EXCLUDED."duracaoMin",
           "posOperatorio" = EXCLUDED."posOperatorio",
           ativo = true,
           "valorEstimadoBrl" = EXCLUDED."valorEstimadoBrl",
           "valorCheioBrl" = EXCLUDED."valorCheioBrl",
           parcelamento = EXCLUDED.parcelamento,
           "escopoOferta" = EXCLUDED."escopoOferta",
           "atualizadoEm" = NOW(),
           "deletadoEm" = NULL
         RETURNING id`,
        [
          o.id, o.nome, o.tipo, o.descricao, o.duracaoMin, o.posOperatorio,
          o.valorEstimadoBrl, o.valorCheioBrl, o.parcelamento, o.escopoOferta,
        ],
      )
      console.log(`       ✅ ${r.rows[0].id}`)
    }
    console.log("")

    // 3) Validacao
    console.log("[3/3] Validacao final — listando ofertas paciente modelo...")
    const validacao = await client.query(`
      SELECT id, nome, "valorEstimadoBrl", "valorCheioBrl", parcelamento, "escopoOferta", ativo
      FROM procedimentos
      WHERE id LIKE 'proc-oferta-pm-%'
      ORDER BY "valorEstimadoBrl" DESC
    `)
    console.table(validacao.rows)

    await client.query("COMMIT")
    console.log("\n[migration] ✅ COMMIT — migration aplicada com sucesso")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("\n[migration] ❌ ROLLBACK — erro:", err)
    throw err
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("ERRO FATAL:", err)
  process.exit(1)
})
