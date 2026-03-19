# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão Geral do Projeto

**Central Dr. Lucas** — sistema web para gestão de atendimento da clínica do Dr. Lucas Felipe. Dois módulos integrados em uma única aplicação Next.js:

1. **Painel de Gestão** — kanban, leads, agendamentos, procedimentos, métricas, roadmap
2. **Agente IA WhatsApp ("Ana Júlia")** — atendimento autônomo de pacientes via API Routes, alimentando o painel em tempo real

## Stack Tecnológica

- **Framework:** Next.js 14+ (App Router)
- **UI:** shadcn/ui exclusivamente (preset `b1Ymqvi3U`) — nunca criar botões, inputs ou cards do zero
- **Estilização:** Tailwind CSS
- **Banco de Dados:** PostgreSQL via Supabase, ORM: Prisma
- **Autenticação:** NextAuth.js (Credentials Provider)
- **Cache/Buffer:** Redis (Upstash)
- **IA:** OpenAI GPT-4o (chat), Whisper (áudio), GPT-4o-mini (visão)
- **WhatsApp:** Uazapi (gateway)
- **Calendário:** Google Calendar API
- **Deploy:** Vercel
- **Testes E2E:** Playwright

## Comandos Comuns

```bash
# Setup inicial
npx shadcn@latest init --preset b1Ymqvi3U --template next
npm install

# Banco de dados
npx prisma generate
npx prisma db push
npx prisma db seed

# Desenvolvimento
npm run dev

# Testes
npx playwright test                    # todos os testes E2E
npx playwright test tests/leads.spec   # arquivo de teste específico

# Prisma
npx prisma studio                      # visualizador do banco
npx prisma migrate dev --name <nome>   # criar migration
```

## Arquitetura

### Perfis de Usuário e Permissões

Três perfis: **Gestor** (acesso total), **Atendente** (operacional), **Desenvolvedor** (total + técnico). O agente IA é um usuário especial do tipo Atendente (`tipo: "ia"`) que opera exclusivamente via API Routes, nunca pelo painel.

### Funil Kanban (9 colunas)

Colunas 1-4 são movidas automaticamente pelo agente IA. Colunas 5-8 exigem ação manual do Atendente/Gestor. Coluna 9 (Perdido) é manual.

### Arquitetura do Agente IA

Fluxo do webhook: `POST /api/webhooks/whatsapp` → detectar tipo de conteúdo → processar mídia se necessário → buffer Redis (debounce 20s, chave: `{chat_id}_buf_dr-lucas`) → concatenar mensagens → GPT-4o com system prompt + memória Redis (20 msgs, chave: `{chat_id}_mem_dr-lucas`) → segmentar resposta → enviar via Uazapi com delay de 1s entre mensagens.

O agente tem 3 etapas no funil: Qualificação → Agendamento → Gestão do Agendamento, usando 6 ferramentas em `/api/agente/*`.

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
- `app/api/agente/` — ferramentas do agente IA (6 endpoints)
- `lib/agente/` — internos do agente: buffer, memória, processamento de mídia, prompt, ferramentas, sincronização do kanban
- `prisma/seed.ts` — seed com 3 procedimentos + usuário IA

## Notas do Modelo de Dados

- `Lead.sobreOPaciente` é texto cumulativo — nunca sobrescrever, apenas adicionar (append)
- `Lead.whatsapp` é único — usado para dedup
- `MensagemWhatsapp.messageIdWhatsapp` é único — usado para dedup de mensagens do WhatsApp
- Todos os nomes de campos dos modelos estão em português (camelCase)

## Ordem de Desenvolvimento

Seguir o roadmap de 13 sprints (Sprint 0-12) em `ROADMAP.md`. Estado atual: fase de setup do projeto.

## Idioma

O sistema é **100% brasileiro**. Todo o código usa português para termos de domínio (campos de modelo, nomes de variáveis, labels da UI). Estrutura de código (pastas, nomes de arquivos) também em português. Manter essa convenção.

### Configurações regionais:
- **Timezone:** `America/Sao_Paulo`
- **Locale:** `pt-BR`
- **Moeda:** BRL (R$)
- **Formato de data:** `dd/MM/yyyy`
- **Formato de telefone:** `+55 (XX) XXXXX-XXXX`
