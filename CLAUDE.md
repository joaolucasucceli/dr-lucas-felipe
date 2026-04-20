# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão Geral do Projeto

**Central Dr. Lucas** — sistema web para gestão de atendimento da clínica do Dr. Lucas Felipe. Sistema **100% autônomo** — a IA faz todo o processo do funil (acolhimento → reunião agendada). Dois módulos integrados em uma única aplicação Next.js:

1. **Painel de Gestão** — kanban (4 etapas), leads, pacientes, procedimentos, métricas, roadmap
2. **Agente IA WhatsApp ("Ana Júlia" + Analista IA)** — atendimento autônomo de pacientes via API Routes, alimentando o painel em tempo real

## Stack Tecnológica

- **Framework:** Next.js 16 (App Router + Turbopack)
- **UI:** shadcn/ui 4 exclusivamente (preset `b1Ymqvi3U`) — nunca criar botões, inputs ou cards do zero
- **Estilização:** Tailwind CSS 4
- **Banco de Dados:** PostgreSQL via Supabase (acesso direto via `@supabase/supabase-js`, sem ORM)
- **Autenticação:** NextAuth.js 4 (Credentials Provider + JWT)
- **Cache/Buffer:** Redis (Upstash)
- **Realtime:** Supabase Realtime (WebSocket)
- **IA:** OpenAI GPT-4o (chat), Whisper (áudio), GPT-4o-mini (visão/classificação)
- **WhatsApp:** Uazapi v2 (gateway)
- **Calendário:** Google Calendar API
- **Data Fetching:** SWR
- **Validação:** Zod
- **Deploy:** Vercel

## Comandos Comuns

```bash
# Setup inicial
npx shadcn@latest init --preset b1Ymqvi3U --template next
npm install

# Desenvolvimento
npm run dev

# Banco de dados (Supabase CLI)
npm run db:types                       # regerar types TS a partir do schema do banco

# Build / qualidade
npm run build
npm run lint
npm run typecheck
```

## Arquitetura

### Perfis de Usuário e Permissões

Dois perfis: **Gestor** (acesso total), **Atendente** (operacional). O agente IA é um usuário especial do tipo Atendente (`tipo: "ia"`) que opera exclusivamente via API Routes, nunca pelo painel.

### Funil Kanban (4 colunas)

Funil simplificado: **Acolhimento → Qualificação → Agendamento → Reunião Agendada**. Todas as colunas são movidas automaticamente pela dupla Ana Júlia (SDR) + Analista IA. Depois de "Reunião Agendada", o funil para — a IA continua respondendo mas não avança mais. Conversão Lead→Paciente é manual (botão no detalhe do lead, só gestor).

### Arquitetura do Agente IA (dual: SDR + Analista)

Dois agentes IA trabalham em paralelo:

- **Ana Júlia** (GPT-4o) — SDR que conversa com o paciente no WhatsApp. Fluxo do webhook: `POST /api/webhooks/whatsapp` → detectar tipo de conteúdo → processar mídia → buffer Redis (debounce 20s, `{chat_id}_buf_dr-lucas`) → concatenar → GPT-4o com system prompt + memória Redis (20 msgs, `{chat_id}_mem_dr-lucas`) → segmentar resposta → Uazapi com delay aleatório 3-5s entre mensagens.
- **Analista** (GPT-4o-mini, JLAU-571) — disparada em fire-and-forget ao final do loop da Ana Júlia. Lê histórico + estado do lead e escreve direto no CRM (nome, procedimento, sobreOPaciente, statusFunil). Controlada pela env `ANALISTA_WRITE_MODE=true` (padrão em produção); sem a flag, roda em shadow mode (só loga em `analista_logs`).

A Ana Júlia conduz a conversa até o horário fechar (usando as 7 ferramentas em `/api/agente/*` incluindo `registrar_agendamento`); a Analista IA avança o funil de Acolhimento → Qualificação → Agendamento. A etapa final (`consulta_agendada`) só é atingida pela tool `registrar_agendamento` da Ana Júlia.

### Segurança da API

- Rotas internas do agente validam header `x-api-secret`
- Rotas do painel validam sessão do usuário
- Endpoint do webhook valida payload da Uazapi

### Regras de Componentes

- `components/ui/` — shadcn/ui gerado, não editar
- `components/features/` — componentes de domínio organizados por módulo
- **StatusBadge** é o único componente que define cores de status — nunca usar `Badge` com classes de cor inline
- **ConfirmDialog** é o único diálogo de confirmação destrutiva — nunca criar AlertDialog inline
- **MetricCard** é o único card de número/métrica — nunca criar card de métrica avulso
- **DataTable** é a única tabela com filtro/paginação — todas as listagens usam ele
- **PageHeader** é obrigatório no topo de toda página

### Convenção de Estrutura de Pastas

- `app/(dashboard)/` — páginas do painel agrupadas sob layout do dashboard com sidebar + verificação de perfil
- `app/api/agente/` — ferramentas do agente IA (7 endpoints) + endpoints auxiliares (processar, cron-manual, limpar-memoria)
- `lib/agente/` — internos do agente: buffer, memória, processamento de mídia, prompt, ferramentas, sincronização do kanban, analista (JLAU-571)
- `supabase/migrations/` — migrations SQL aplicadas manualmente no Supabase (sem Prisma)
- `lib/supabase.ts` — clients Supabase (`supabaseAdmin` para server-side com service role e `supabaseAnon` para client-side)
- `lib/types/database.ts` — types TypeScript gerados pelo Supabase CLI (`npm run db:types`)
- `lib/types/enums.ts` — enums do banco re-exportados a partir de `database.ts`
- `lib/db-utils.ts` — helpers `criarId()` (cuid2) e `agora()` (ISO timestamp) usados nos `insert/update`

## Notas do Modelo de Dados

- `Lead.sobreOPaciente` é texto cumulativo — nunca sobrescrever, apenas adicionar (append)
- `Lead.whatsapp` é único — usado para dedup
- `MensagemWhatsapp.messageIdWhatsapp` é único — usado para dedup de mensagens do WhatsApp
- Todos os nomes de campos dos modelos estão em português (camelCase)

## Documentação — Regra Obrigatória

> **CRÍTICO:** A documentação do sistema DEVE ser mantida sempre atualizada.

O arquivo de documentação centralizada fica em:
```
lib/documentacao/conteudo.ts
```

**Toda sprint, feature ou mudança no sistema DEVE atualizar esse arquivo.** O botão "Baixar Documentação" em `/documentacao` gera o `.md` a partir dele — se estiver desatualizado, o documento exportado estará errado.

### O que deve ser atualizado em `lib/documentacao/conteudo.ts`

| Tipo de mudança | O que atualizar |
|-----------------|-----------------|
| Nova página/módulo | Adicionar seção completa com funcionalidades, como usar e permissões |
| Nova funcionalidade | Adicionar na seção do módulo correspondente |
| Mudança de permissão de perfil | Atualizar tabela de permissões do módulo |
| Novo modelo de dados | Atualizar seção "Modelo de Dados — Referência Rápida" |
| Nova rota de API | Atualizar se for relevante para o usuário final |
| Mudança no funil kanban | Atualizar seção do Módulo 3 — Atendimentos |
| Nova ferramenta do agente IA | Atualizar tabela de ferramentas no Módulo 6 — Ana Júlia (SDR) |

### Campos a atualizar sempre

- `VERSAO_DOCUMENTACAO` — incrementar a versão (semver: patch para ajustes, minor para features)
- `DATA_ATUALIZACAO` — sempre atualizar para a data da mudança (formato `YYYY-MM-DD`)

## Números do Sistema

| Métrica | Quantidade |
|---------|-----------|
| Páginas | 20 (17 dashboard + 2 públicas + 1 root) |
| Endpoints API | 76 |
| Tabelas no banco | 24 |
| Enums | 12 |
| Componentes | 92 (28 UI + 64 features) |
| Hooks customizados | 20 |

## Issues Conhecidas

_Nenhuma issue técnica conhecida no momento. Issues abertas no Linear são entregas de produto, não bugs estruturais._

## Estado do Projeto

Sistema em produção com todos os módulos core implementados. Sprint 2 (chat atendente + gestão de instâncias) concluída em 2026-04-04 — 18 tasks implementadas. Sprint 1 (validação do agente IA) planejada no ClickUp com 22 tasks de teste end-to-end.

## Idioma

O sistema é **100% brasileiro**. Todo o código usa português para termos de domínio (campos de modelo, nomes de variáveis, labels da UI). Estrutura de código (pastas, nomes de arquivos) também em português. Manter essa convenção.

### Configurações regionais:
- **Timezone:** `America/Sao_Paulo`
- **Locale:** `pt-BR`
- **Moeda:** BRL (R$)
- **Formato de data:** `dd/MM/yyyy`
- **Formato de telefone:** `+55 (XX) XXXXX-XXXX`
