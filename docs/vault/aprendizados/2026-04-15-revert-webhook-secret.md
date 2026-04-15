---
title: Revert do hardening de webhook secret em producao
date: 2026-04-15
tags: [aprendizado, deploy, producao, webhook, agente]
---

# Revert do hardening de webhook secret em producao

## O que aconteceu

Implementei CLIENTE-253 (validar `WEBHOOK_SECRET` obrigatorio em producao) e fiz deploy direto. O resultado: **a Ana Julia parou de receber mensagens em producao por 13 minutos** (17:02 → 17:15 BRT), porque a env nao estava configurada na Vercel e o handler comecou a retornar 500 para todos os webhooks.

## Como descobri

Auditoria pos-deploy: `curl -X POST` no endpoint do webhook em producao retornou 500. Confirmei via `vercel env ls` que `WEBHOOK_SECRET` nao estava entre as 11 envs configuradas.

## Causa raiz

Mudancas que dependem de configuracao externa (env var na Vercel + token no Uazapi) precisam ser **coordenadas em janela combinada com o cliente**, nao deployadas direto. O hardening so e seguro se a configuracao externa estiver pronta antes.

## Lição

**Antes de hardening que pode quebrar producao**, sempre:

1. Validar via `vercel env ls` que a env existe — NAO assumir
2. Validar que o sistema externo (Uazapi, Google, etc.) esta enviando o que voce vai validar
3. Se nao estiver, coordenar com o cliente e configurar primeiro
4. Soft-launch quando possivel (warning antes de erro)
5. Ter plano de rollback rapido (commit isolado, revert simples)

**Padrao a aplicar:** mudancas de seguranca devem ser feature-flagged ou condicionadas a uma env explicita (`WEBHOOK_STRICT=true`), nao a `NODE_ENV === "production"`.

## Veja tambem

- [[2026-04-15-sprint-pre-reuniao-dr-lucas]]
- CLIENTE-253 (reaberto)
