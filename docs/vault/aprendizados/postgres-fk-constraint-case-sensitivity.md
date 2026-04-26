---
title: PostgreSQL lowercases nomes de constraint sem aspas — quebra hint do Supabase
date: 2026-04-26
tags: [postgres, supabase, foreign-key, migration, supabase-rest, debugging]
---

# PostgreSQL lowercases nomes de constraint sem aspas — quebra hint do Supabase

## O bug

Página `/contatos` ficou retornando `"Erro ao carregar contatos"`. Endpoint `/api/contatos` respondia 500. As queries de [agenda](../../app/api/agenda/route.ts), [kanban](../../app/api/contatos/kanban/route.ts), [relatórios](../../app/api/relatorios/exportar/route.ts) e o [follow-up do agente](../../lib/agente/followup.ts) tinham o mesmo sintoma silencioso (alguns só falhavam quando havia dados pra fazer JOIN).

## Causa raiz

A migration [20260421000000_unificar_contatos.sql:49](../../supabase/migrations/20260421000000_unificar_contatos.sql#L49) — que unificou `leads` + `pacientes` em `contatos` (JLAU-603) — declarou as foreign keys assim:

```sql
CONSTRAINT contatos_responsavelId_fkey
  FOREIGN KEY ("responsavelId") REFERENCES usuarios(id) ON DELETE SET NULL
```

**O nome da constraint não está entre aspas duplas.** PostgreSQL trata identifiers não-quotados como case-insensitive e os armazena em **lowercase**. Resultado: a constraint virou `contatos_responsavelid_fkey` no banco — não `contatos_responsavelId_fkey`.

Mas o código que usa Supabase faz hint do JOIN com nome literal em camelCase:

```ts
.select("responsavel:usuarios!contatos_responsavelId_fkey(id, nome)")
```

O Supabase REST faz **match literal** do nome da constraint. Como `contatos_responsavelId_fkey` não existe (no banco é `..._responsavelid_fkey`), a query falha com erro 42P01 / "Could not find a relationship".

A mesma migration criou 6 outras constraints com o mesmo bug:
- `agendamentos_contatoId_fkey`
- `conversas_contatoId_fkey`
- `mensagens_whatsapp_contatoId_fkey`
- `prontuarios_contatoId_fkey`
- `analista_logs_contatoId_fkey`

Curiosidade: `fotos_contato` foi criada com a FK **inline** sem nome explícito (`"contatoId" text NOT NULL REFERENCES contatos(id) ON DELETE CASCADE`). O Postgres derivou o nome a partir da coluna `"contatoId"` (que **estava** entre aspas) — então essa única ficou em camelCase corretamente. Sorte.

## Como diagnosticar rápido

Os scripts em [scripts/check-all-fks.ts](../../scripts/check-all-fks.ts) e [scripts/check-fk.ts](../../scripts/check-fk.ts) fazem probe de cada FK testando o nome em camelCase **e** lowercase. Se aparecer `❌ camelCase | ✓ lowercase`, é exatamente esse bug.

## A correção

Renomear as constraints no banco com aspas duplas para preservar o case (em vez de mudar 9 arquivos de código):

```sql
ALTER TABLE contatos
  RENAME CONSTRAINT contatos_responsavelid_fkey TO "contatos_responsavelId_fkey";
-- ... idem para as outras 5
```

Ver migration completa: [20260426000000_corrigir_nomes_fk_contatos.sql](../../supabase/migrations/20260426000000_corrigir_nomes_fk_contatos.sql) (JLAU-977).

## Bug colateral encontrado

Durante o diagnóstico, descobri que a query da rota `/api/contatos` ainda referenciava a coluna `ativo` (que existia na tabela `pacientes` antiga, mas foi removida na unificação — só sobrou `arquivado`). O erro estava **mascarado** pelo bug da FK: a query falhava antes mesmo de chegar no SELECT da coluna inexistente. Ao corrigir as FKs, esse segundo bug ficou visível. Conserto: remover `, ativo` do `SELECT_CONTATO` em [app/api/contatos/route.ts:9](../../app/api/contatos/route.ts#L9).

## Lições

1. **Sempre quotar nome de constraint em migration**: `CONSTRAINT "minha_FK_emCamelCase" ...` — sem as aspas, vai virar lowercase silenciosamente.
2. **Bug A pode mascarar bug B**: quando uma query falha cedo (FK não resolve), bugs seguintes na mesma query (coluna inexistente, filtro inválido) só aparecem depois de corrigir o primeiro. Sempre re-rodar testes ao corrigir uma camada.
3. **`lib/types/database.ts` é fonte da verdade pra debugging de FK**: ele é gerado por introspection do banco real (via `npm run db:types`). Comparar o `foreignKeyName` ali com o hint usado no código resolve esse tipo de divergência em segundos.
4. **Evitar FK inline sem nome**: `REFERENCES tabela(col)` sem `CONSTRAINT nome_explicito` deixa o Postgres autogerar o nome — o que dificulta hints estáveis no Supabase REST. Sempre nomear explicitamente, com aspas.

## Padrão para migrations futuras

```sql
-- ✓ CORRETO
CONSTRAINT "minhaTabela_minhaColuna_fkey"
  FOREIGN KEY ("minhaColuna") REFERENCES outraTabela(id) ON DELETE CASCADE

-- ✗ ERRADO (vira lowercase)
CONSTRAINT minhaTabela_minhaColuna_fkey
  FOREIGN KEY ("minhaColuna") REFERENCES outraTabela(id) ON DELETE CASCADE
```
