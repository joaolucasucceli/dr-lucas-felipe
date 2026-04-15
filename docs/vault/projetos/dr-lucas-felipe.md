---
title: Dr. Lucas Felipe
date: 2026-04-15
tags: [projeto, cliente, atendimento-ia]
empresa: Dr. Lucas Ferreira (branding atualizado)
status: Em producao
---

# Dr. Lucas Ferreira — Sistema de Atendimento com IA

**Cliente:** Dr. Lucas Felipe Ferreira — cirurgiao plastico/estetica avancada (Sao Paulo)
**Branding:** "Dr. Lucas Ferreira — Estetica Avancada"
**Status:** Em producao
**Repositorio:** https://github.com/joaolucasucceli/dr-lucas-felipe
**Producao:** https://dr-lucas-central.vercel.app
**Vercel team:** luna-analisa

## Stack

Next.js 16 (App Router + Turbopack), shadcn/ui 4, Tailwind 4, Prisma 7, PostgreSQL (Supabase), NextAuth.js 4, Redis (Upstash), Supabase Realtime, OpenAI GPT-4o + Whisper + GPT-4o-mini vision, Uazapi v2, Google Calendar API, Vercel.

## Modulos

1. **Site institucional** (rotas publicas) — landing page, captacao de leads, LGPD
2. **Painel de gestao** (dashboard) — kanban de atendimentos, leads, agendamentos, procedimentos, base de conhecimento, configuracoes, documentacao, metricas
3. **Agente IA "Ana Julia"** (WhatsApp via Uazapi) — qualificacao automatica + agendamento + integracao Google Calendar

## Status atual (2026-04-15)

- 21 paginas, 91 endpoints, 24 models, 98 componentes, 41/41 testes Playwright
- Sprint pre-reuniao executada hoje: 18 issues entregues
- Reuniao com cliente confirmada para 20:30 (CLIENTE-119)

Detalhes da sprint do dia: [[2026-04-15-sprint-pre-reuniao-dr-lucas]]

## Pessoas

- [[dr-lucas-felipe]] — cliente

## Aprendizados-chave

- [[2026-04-15-revert-webhook-secret]] — coordenar mudancas de seguranca com config externa
- [[2026-04-15-snapinsta-instagram-download]] — receita pra baixar reels Instagram
- [[2026-04-15-vercel-conta-multipla]] — multi-conta gh CLI e alias Vercel
