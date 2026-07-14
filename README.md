# Central Dr. Lucas

Sistema da clínica do Dr. Lucas Ferreira (estética avançada e contorno corporal). Cobre três frentes: site público, dashboard da clínica (agenda, atendimentos, contatos, procedimentos, relatórios) e a **Ana Júlia** — agente de IA que faz o pré-atendimento via WhatsApp: qualifica o lead (procedimento + região + foto), gera orçamento em PDF e agenda a reunião de diagnóstico online (único evento agendável pela IA).

## Stack

- Next.js 16.1.7 (App Router) + React 19 + TypeScript
- Supabase (`src/lib/supabase.ts`) + Upstash Redis (`src/lib/redis.ts`)
- OpenAI (`src/lib/openai.ts`) para a agente; WhatsApp via Uazapi (`src/lib/uazapi.ts`, webhook em `src/app/api/webhooks/whatsapp/`)
- Google Calendar (`src/lib/google-calendar.ts`)
- Deploy: Vercel

O agente inteiro vive em `src/lib/agente/`: `loop.ts` (orquestração), `ferramentas.ts` (tools), `prompt.ts` (script fixo da Ana Júlia), buffer, follow-up e handoff.

## Como rodar

```bash
npm run dev        # dev server (turbopack)
npm run build      # build de produção
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run db:types   # regenera src/lib/types/database.ts a partir do Supabase
```

## Crons (vercel.json)

- `/api/cron/follow-ups` — de hora em hora (`0 * * * *`)
- `/api/cron/auto-close` — a cada 6 horas (`0 */6 * * *`)

## Documentação

Este README + `CLAUDE.md` são a referência do projeto. A pasta `docs/` (blueprint do fluxo de orçamento e vault de decisões/aprendizados) foi removida em 14/07/2026 — o essencial foi incorporado ao `CLAUDE.md`; para o histórico completo, consultar o Git.
