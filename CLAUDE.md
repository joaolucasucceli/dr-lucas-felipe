# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão Geral do Projeto

**Central Dr. Lucas** — sistema web para gestão de atendimento da clínica do Dr. Lucas Felipe. Sistema **100% autônomo** — a IA faz todo o processo do funil (acolhimento → reunião agendada). **Agendamentos são criados EXCLUSIVAMENTE pela Ana Júlia via WhatsApp** — o painel não tem botão de criar agendamento manual (decisão arquitetural: força todo lead pelo funil da IA). Edição/remarcação/cancelamento manual continuam disponíveis pro gestor após o agendamento existir. Dois módulos integrados em uma única aplicação Next.js:

1. **Painel de Gestão** — kanban (4 etapas), contatos (leads e pacientes), procedimentos, agenda, conteúdo da IA (textos + mídias), métricas
2. **Agente IA WhatsApp ("Ana Júlia" + Analista IA)** — atendimento autônomo de pacientes via API Routes, alimentando o painel em tempo real

## Stack Tecnológica

- **Framework:** Next.js 16 (App Router + Turbopack)
- **UI:** shadcn/ui 4 exclusivamente (preset `b1Ymqvi3U`) — nunca criar botões, inputs ou cards do zero
- **Tema:** dark-only (forçado via `forcedTheme="dark"` no `ThemeProvider`)
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
- **Forms:** react-hook-form + `FormDialog` reutilizável (toda edição é modal, exceto Contato que tem página própria com autosave)
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

Funil simplificado: **Acolhimento → Qualificação → Agendamento → Reunião Agendada**. Todas as colunas são movidas automaticamente pela dupla Ana Júlia (SDR) + Analista IA. Depois de "Reunião Agendada", o funil para — a IA continua respondendo mas não avança mais. Promoção de lead → paciente é manual (botão no detalhe do contato, só gestor).

### Arquitetura do Agente IA (dual: SDR + Analista)

Dois agentes IA trabalham em paralelo:

- **Ana Júlia** (GPT-4o) — SDR que conversa com o paciente no WhatsApp. Fluxo do webhook: `POST /api/webhooks/whatsapp` → detectar tipo de conteúdo → processar mídia → buffer Redis (debounce 20s, `{chat_id}_buf_dr-lucas`) → concatenar → GPT-4o com system prompt + memória Redis (20 msgs, `{chat_id}_mem_dr-lucas`) → segmentar resposta → Uazapi com delay aleatório 3-5s entre mensagens.
- **Analista** (GPT-4o-mini, JLAU-571) — disparada em fire-and-forget ao final do loop da Ana Júlia. Lê histórico + estado do lead e escreve direto no CRM (nome, procedimento, sobreOPaciente, statusFunil). Controlada pela env `ANALISTA_WRITE_MODE=true` (padrão em produção); sem a flag, roda em shadow mode (só loga em `analista_logs`).

A Ana Júlia conduz a conversa até o horário fechar (usando as 9 ferramentas em `/api/agente/*` — incluindo `consultar_base_conhecimento` para dúvidas da clínica, `consultar_agenda` que cruza Google Calendar + expediente, e `registrar_agendamento`); a Analista IA avança o funil de Acolhimento → Qualificação → Agendamento. A etapa final (`consulta_agendada`) só é atingida pela tool `registrar_agendamento` da Ana Júlia.

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
- **DataTable** é a única tabela com filtro/paginação — todas as listagens usam ele. Suporta ações em massa via props `selecionavel` + `acoesEmMassa` (checkbox + toolbar). Cada entidade tem endpoint `POST /api/<entidade>/batch` com `{ ids, acao }`
- **FormDialog** é o wrapper padrão pra toda criação/edição — exceto Contato que tem página própria com autosave. Larguras: `sm` (1-2 inputs), `md` (default), `lg` (textarea longa), `xl` (raro). Detalhes em [docs/vault/aprendizados/2026-04-26-padrao-modal-vs-pagina.md](docs/vault/aprendizados/2026-04-26-padrao-modal-vs-pagina.md)
- **PageHeader** é obrigatório no topo de toda página

### Layout do dashboard

- `DashboardShell` envolve sidebar (`AppSidebar`) + header (`AppHeader`) + conteúdo
- **Header** minimalista: só o ícone de Ajuda Contextual no desktop (mobile ganha o trigger do menu)
- **Sidebar** com 5 grupos (gestor): Geral, Comercial, Operacional, Colaboradores, Sistema. Footer com botão Sair

### Convenção de Estrutura de Pastas

- `app/(dashboard)/` — páginas do painel agrupadas sob layout do dashboard com sidebar + verificação de perfil
- `app/api/agente/` — ferramentas do agente IA (9 endpoints) + endpoints auxiliares (processar, cron-manual, limpar-memoria)
- `lib/agente/` — internos do agente: buffer, memória, processamento de mídia, prompt, ferramentas, sincronização do kanban, analista (JLAU-571), tipos compartilhados (`types.ts`)
- `lib/format.ts` — helpers `formatarData()` (timezone SP) e `formatarWhatsapp()` (+55 (DD) 9XXXX-XXXX)
- `supabase/migrations/` — migrations SQL aplicadas manualmente no Supabase (sem Prisma)
- `lib/supabase.ts` — clients Supabase (`supabaseAdmin` para server-side com service role e `supabaseAnon` para client-side)
- `lib/types/database.ts` — types TypeScript gerados pelo Supabase CLI (`npm run db:types`)
- `lib/types/enums.ts` — enums do banco re-exportados a partir de `database.ts`
- `lib/db-utils.ts` — helpers `criarId()` (cuid2) e `agora()` (ISO timestamp) usados nos `insert/update`

## Notas do Modelo de Dados

- `Contato.sobreOPaciente` é texto cumulativo — nunca sobrescrever, apenas adicionar (append)
- `Contato.whatsapp` é único — usado para dedup
- `Contato.tipo` é `'lead' | 'paciente'` — promoção lead → paciente preserva o `id`
- `MensagemWhatsapp.messageIdWhatsapp` é único — usado para dedup de mensagens do WhatsApp
- Todos os nomes de campos dos modelos estão em português (camelCase)

## Números do Sistema (atualizado 2026-04-26)

| Métrica | Quantidade |
|---------|-----------|
| Páginas dashboard | 12 (`/dashboard`, `/atendimentos`, `/agenda`, `/contatos` + `/contatos/[id]`, `/procedimentos`, `/conteudo-ia`, `/equipe-ia`, `/configuracoes/{google-agenda,whatsapp,site,usuarios}`) |
| Páginas totais | 15 (12 dashboard + `/login` + `/lgpd` + raiz) |
| Endpoints API | 83 |
| Tabelas no banco | 24 |
| Enums | 12 |
| Componentes | 95 (29 UI + 66 features) |
| Hooks customizados | 19 |
| Migrations | 9 |

## Issues Conhecidas

_Nenhuma issue técnica conhecida no momento. Issues abertas no Linear são entregas de produto, não bugs estruturais._

## Estado do Projeto

Sistema em **modo manutenção** após auditoria final de entrega (JLAU-609, 2026-04-21) + ondas de simplificação de UI (JLAU-989 → JLAU-995, 2026-04-26). Todos os módulos core entregues:
- Site público institucional (8 seções)
- Painel de gestão (12 páginas dashboard)
- Agente IA WhatsApp (arquitetura dual Ana Júlia + Analista)
- Pacientes + Protocolos (bônus)

Refatorações recentes (2026-04-26):
- **Sidebar consolidada**: 16 → 12 itens (gestor). Eliminado dropdown do header, Meu Perfil, Configurações (hub), Tipos de Procedimento (página), Mídia Marketing como página dedicada, perfis Ana Júlia/Eduarda separados
- **Novas páginas com Tabs**: `/equipe-ia` (Ana Júlia + Eduarda), `/conteudo-ia` (Conteúdo em Texto + Conteúdo em Mídia)
- **Header limpo**: removidos busca global, notificações, theme toggle. Sobra apenas Ajuda Contextual
- **Tema dark-only** via `forcedTheme`
- **Padrão modal consolidado** em 100% das edições (exceto Contato)

Itens em aberto no Linear aguardam ação do cliente (credenciais Google/WhatsApp) ou dependem de tráfego real. Não há bugs estruturais.

## Idioma

O sistema é **100% brasileiro**. Todo o código usa português para termos de domínio (campos de modelo, nomes de variáveis, labels da UI). Estrutura de código (pastas, nomes de arquivos) também em português. Manter essa convenção.

### Configurações regionais:
- **Timezone:** `America/Sao_Paulo`
- **Locale:** `pt-BR`
- **Moeda:** BRL (R$)
- **Formato de data:** `dd/MM/yyyy`
- **Formato de telefone:** `+55 (XX) XXXXX-XXXX`
