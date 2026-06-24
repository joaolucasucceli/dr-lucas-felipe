# Agents Guide - Central Dr. Lucas

## Visao Geral

Central Dr. Lucas e uma aplicacao Next.js para gestao da clinica do Dr. Lucas Ferreira e atendimento autonomo via WhatsApp. O produto combina:

- Site publico institucional em `app/(site)` e rota raiz.
- Painel autenticado em `app/(dashboard)` para dashboard, kanban, contatos, prontuario, agenda, procedimentos, conteudo da IA, usuarios e configuracoes.
- Agente IA unico, "Ana Julia", em `lib/agente` e `app/api/agente`, acionado por webhook do WhatsApp em `app/api/webhooks/whatsapp`.

O sistema e brasileiro de ponta a ponta. Mantenha textos, variaveis de dominio, nomes de campos e labels em portugues.

## Stack

- Next.js 16 com App Router, React 19 e TypeScript strict.
- Tailwind CSS 4 + shadcn/ui 4, com tema dark-only via `components/theme-provider.tsx`.
- NextAuth 4 com Credentials Provider e JWT.
- Supabase/Postgres via `@supabase/supabase-js`, sem ORM.
- Supabase Storage e Realtime.
- Upstash Redis para rate limit, memoria e buffer/debounce do agente.
- OpenAI para conversa, transcricao/classificacao e processamento multimodal.
- Uazapi para WhatsApp.
- Google Calendar para agendamentos.
- Zod para validacao.
- SWR ou hooks locais para data fetching conforme padrao existente.

## Comandos

Use estes comandos antes de finalizar mudancas relevantes:

```bash
npm run lint
npm run typecheck
npm run build
```

Comandos uteis:

```bash
npm run dev
npm run format
npm run db:types
```

`npm run db:types` regenera `lib/types/database.ts` a partir do projeto Supabase configurado no script. So rode quando o schema remoto for a fonte de verdade.

## Estrutura Principal

- `app/(dashboard)/`: paginas do painel protegidas por `getSession()` no layout.
- `app/api/`: Route Handlers do painel, agente, crons, webhooks e integracoes.
- `app/(site)/components/`: secoes do site publico.
- `components/ui/`: componentes shadcn gerados. Evite editar manualmente.
- `components/features/`: componentes de dominio por modulo.
- `components/features/shared/`: wrappers padrao reutilizaveis do painel.
- `hooks/`: hooks client-side para chamadas a `/api` e inscricoes realtime.
- `lib/agente/`: loop, prompt, tools, memoria, buffer, midias, follow-up e agendamento do agente.
- `lib/validations/`: schemas Zod compartilhados entre API e UI.
- `lib/types/database.ts`: tipos gerados do Supabase.
- `lib/types/enums.ts`: enums derivados do banco.
- `supabase/migrations/`: migrations SQL manuais.
- `docs/vault/`: decisoes, aprendizados e contexto historico do projeto. Nao use para documentacao funcional.

## Regras de Arquitetura

- Nao introduza ORM. Use `supabaseAdmin` no servidor e `getSupabaseBrowser()` no cliente.
- IDs novos devem usar `criarId()` de `lib/db-utils.ts`; timestamps devem usar `agora()`.
- Rotas do painel devem validar sessao com `requireAuth`, `requireRole` ou `requireAnyRole`.
- Rotas internas do agente devem validar `x-api-secret` com `validarApiSecret`.
- Payloads de escrita devem passar por schema Zod em `lib/validations`.
- Preserve soft delete quando a entidade usa `deletadoEm`.
- Campos do banco usam portugues em camelCase. Nao crie aliases em ingles para dominio.
- Contato criado manualmente nasce como lead; paciente e promovido por fluxo proprio.
- `Contato.sobreOPaciente` e cumulativo: sempre adicionar contexto, nunca sobrescrever sem motivo explicito.

## Regras do Agente WhatsApp

- A Ana Julia e o unico agente. Nao recrie pipeline de segundo agente/analista.
- Fluxo principal: webhook WhatsApp -> salva contato/conversa/mensagem -> buffer Redis -> `/api/agente/processar` -> `processarMensagens()` -> OpenAI tool calling -> Uazapi.
- O debounce do agente e sensivel. Nao remova locks, buffer ou delays sem entender impacto em custo, duplicidade e UX.
- Agendamentos sao criados exclusivamente pela Ana Julia via `registrar_agendamento`. O `POST /api/agendamentos` manual retorna `410` por decisao de produto.
- A etapa `consulta_agendada` deve ser atingida por `registrar_agendamento`, nao por `atualizar_lead`.
- Antes de oferecer horario ao paciente, a IA deve usar `consultar_agenda`; nunca inventar slots.
- Email e obrigatorio para `registrar_agendamento`, pois o Google Calendar precisa enviar convite.
- Tools que falham retornam `{ ok: false, error, httpStatus }`. Nao altere esse contrato sem ajustar o prompt e o loop.
- Handoff humano e orcamento manual dependem de flags como `aguardandoOrcamentoHumano`; cuidado para nao reativar a IA indevidamente.
- Webhook deve ignorar grupos, deduplicar por `messageIdWhatsapp` e respeitar rate limit.
- Em producao, `NEXTAUTH_URL`, `API_SECRET`, `OPENAI_API_KEY` e `WEBHOOK_SECRET` sao criticas para o agente.

## UI e Componentes

- Use shadcn/ui e componentes existentes. Nao crie botao, input, card, dialog ou tabela do zero se ja houver equivalente.
- `PageHeader` deve aparecer no topo de paginas do dashboard.
- `DashboardShell` controla sidebar, header e area de conteudo.
- `DataTable` e o padrao para listagens com filtro, paginacao, ordenacao e acoes em massa.
- `FormDialog` e o padrao para criacao/edicao em modal, exceto detalhe de contato com pagina propria e autosave.
- `ConfirmDialog` e o padrao para acoes destrutivas.
- `StatusBadge` centraliza cores de status; evite `Badge` com classes de status inline.
- `MetricCard` e o padrao para metricas numericas.
- O painel e dark-only. Nao adicione alternancia de tema sem pedido explicito.
- Use icones de `lucide-react` quando houver acao visual.

## APIs e Dados

- Route Handlers usam `NextResponse.json`.
- Filtros de listagem seguem `pagina`, `porPagina`, `busca` e parametros especificos.
- Para erros de validacao, retorne status `400` com `parsed.error.flatten()`.
- Para conflito de unicidade esperado, use status `409`.
- Para operacao descontinuada por regra de produto, use status `410`.
- Para batch actions, siga o padrao `POST /api/<entidade>/batch` com `{ ids, acao }`.
- Realtime e centralizado em `lib/realtime.tsx`; hooks usam `useRealtimeTabela`.

## Banco e Migrations

- Migrations vivem em `supabase/migrations` e sao SQL puro.
- Mantenha migrations pequenas, datadas e reversiveis quando possivel.
- Depois de mudanca real de schema, atualize `lib/types/database.ts` com `npm run db:types`.
- Ao escrever queries PostgREST com relacionamentos, confira nomes de FKs. O projeto ja teve aprendizados sobre case sensitivity e nomes de constraints em `docs/vault/aprendizados`.

## Cron e Integracoes

Crons Vercel estao em `vercel.json`:

- `/api/cron/follow-ups` a cada hora.
- `/api/cron/confirmacoes` a cada hora.
- `/api/cron/pos-evento` a cada hora.
- `/api/cron/auto-close` a cada 6 horas.

Rotas cron devem validar `CRON_SECRET` conforme padrao existente.

## Estilo de Codigo

- TypeScript strict. Evite `any`; quando inevitavel em payload externo, isole e valide.
- Prefira Server Components por padrao; use `"use client"` apenas quando precisar de estado, efeitos, contexto, eventos ou hooks de browser.
- Use `@/` para imports internos.
- Comentarios devem explicar decisoes ou riscos, nao repetir o codigo.
- Preserve o estilo Prettier do repo.
- Nao mova ou refatore codigo fora do escopo da tarefa.

## Documentacao

- `CLAUDE.md` contem contexto historico e operacional amplo; use como referencia, mas valide no codigo antes de assumir numeros ou regras atuais.
- `docs/vault` guarda decisoes e aprendizados, nao manuais de usuario.
- Documentacao funcional exposta ao usuario fica em `components/features/documentacao/modulos/*`.

## Checklist Antes de Entregar

- A mudanca respeita as regras de auth da rota tocada?
- Escritas foram validadas com Zod?
- Nao quebrou o fluxo autonomo de agendamento pela Ana Julia?
- Nao editou `components/ui` sem necessidade?
- Nao introduziu ingles em dominio brasileiro?
- Rodou `npm run lint`, `npm run typecheck` e, se houver impacto de build, `npm run build`?
