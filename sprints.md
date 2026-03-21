# Sprints — Central Dr. Lucas

> Cada sprint segue o ciclo completo: auditoria → back-end → front-end → `npm run build` → Playwright → commit → deploy Vercel → smoke test em produção.

---

## Sprint 1 — Controle de Acesso e Permissões

**Objetivo:** Garantir que cada perfil só acesse o que lhe compete e que as APIs estejam protegidas corretamente.

**Perfis e acessos definidos:**

| Módulo | Gestor | Atendente |
|--------|--------|-----------|
| Dashboard | ✅ (completo) | ✅ (simplificado) |
| Atendimentos | ✅ | ✅ |
| Leads | ✅ | ✅ |
| Agendamentos | ✅ | ✅ |
| Procedimentos | ✅ | ❌ |
| Configurações | ✅ | ❌ |
| Ana Júlia | ✅ | ❌ |
| Relatórios | ✅ | ❌ |

**Tarefas:**

- [x] `AppSidebar.tsx` — adicionar `perfis: ["gestor"]` ao item Procedimentos
- [x] `dashboard/page.tsx` — ocultar seção "Atividade do Agente IA" para perfil `atendente`
- [x] `dashboard/page.tsx` — métricas simplificadas para `atendente`: substituir "Taxa de Conversão" e "Leads por Origem" por "Leads do Dia" e "Agendamentos da Semana"
- [x] Auditar API routes: `app/api/procedimentos/*` e `app/api/configuracoes/*` garantindo `requireRole("gestor")`
- [x] Auditar `app/api/dashboard/*` — bloquear dados da IA para Atendente
- [x] Playwright: login como Atendente → verificar sidebar sem Procedimentos → tentar acessar `/procedimentos` diretamente → deve redirecionar para `/dashboard`

**Arquivos críticos:**
- `components/features/shared/AppSidebar.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/api/procedimentos/route.ts`
- `app/api/dashboard/atividade-agente/route.ts`

---

## Sprint 2 — Header: Meu Perfil e Acesso Rápido

**Objetivo:** Permitir que qualquer usuário edite seu próprio perfil e que o Gestor acesse Configurações diretamente pelo header.

**Tarefas:**

- [x] `AppHeader.tsx` — adicionar item "Meu Perfil" no dropdown (todos os perfis), acima do separador
- [x] `AppHeader.tsx` — adicionar item "Configurações" no dropdown (apenas `gestor`), acima do separador
- [x] Criar `app/(dashboard)/meu-perfil/page.tsx`:
  - PageHeader com título "Meu Perfil"
  - Campos: Nome, E-mail, Alterar Senha (campo atual + nova senha + confirmação)
  - Botão salvar com feedback de sucesso/erro
- [x] Criar `app/api/usuarios/me/route.ts`:
  - `GET` — retorna dados do usuário autenticado
  - `PATCH` — atualiza nome, email e/ou senha (validar senha atual antes de alterar)
- [x] Playwright: editar nome → verificar atualização no header sem reload manual

**Arquivos críticos:**
- `components/features/shared/AppHeader.tsx`
- `app/(dashboard)/meu-perfil/page.tsx` _(novo)_
- `app/api/usuarios/me/route.ts` _(novo)_

---

## Sprint 3 — Dashboard: Alertas e Follow-ups

**Objetivo:** Evitar que o dashboard fique sobrecarregado — limitar itens visíveis e criar atalhos para a lista completa filtrada.

**Tarefas:**

- [x] `LeadsAlerta.tsx` — exibir no máximo 5 leads; se houver mais, mostrar botão "Ver todos ({n})" que navega para `/leads?filtro=alerta`
- [x] `app/api/dashboard/leads-alerta/route.ts` — mudar `take: 10` para `take: 5`; adicionar campo `total` na resposta para o badge do botão
- [x] Componente de Follow-ups — mesmo padrão: limitar a 5 + botão "Ver todos ({n})" → `/leads?filtro=followup`
- [x] `leads/page.tsx` — ler query param `?filtro=` e aplicar filtro automático ao carregar a página (`alerta` ou `followup`)
- [x] Remover card "Atividade do Agente IA" do dashboard do Atendente (movido da Sprint 1 — pode ser combinado)
- [x] Playwright: verificar que dashboard não exibe mais de 5 alertas → clicar "Ver todos" → verificar leads com filtro ativo

**Arquivos críticos:**
- `components/features/dashboard/LeadsAlerta.tsx`
- `app/api/dashboard/leads-alerta/route.ts`
- `app/(dashboard)/leads/page.tsx`

---

## Sprint 4 — Kanban: Layout, Scroll e Criação Manual

**Objetivo:** Corrigir o vazamento de largura do Kanban e adicionar criação manual de leads e de novos atendimentos.

**Tarefas:**

**Layout:**
- [x] `KanbanView.tsx` — adicionar container com `overflow: hidden` e altura fixa (`h-[calc(100svh-232px)]`)
- [x] `KanbanBoard.tsx` — garantir que o `overflow-x-auto` está no container interno; página de Atendimentos deve ter a mesma largura máxima das demais

**Criação manual de Lead:**
- [x] `atendimentos/page.tsx` — adicionar botão "Novo Lead" no PageHeader (reaproveitar `LeadForm` já existente em `/leads`)
- [x] Após criar lead, atualizar o kanban via revalidação/refresh

**Criação manual de Atendimento (novo ciclo):**
- [x] Criar `NovoAtendimentoModal.tsx`:
  - Select de lead (busca por nome/whatsapp)
  - Exibe status atual do lead selecionado
  - Botão confirmar cria novo ciclo (`cicloAtual + 1`, reset de `statusFunil` para `primeiro_atendimento`)
- [x] `atendimentos/page.tsx` — botão "Novo Atendimento" no PageHeader que abre `NovoAtendimentoModal`
- [x] `app/api/atendimentos/route.ts` _(novo)_ — endpoint `POST /api/atendimentos`:
  - Validação: se `Lead.statusFunil` não for `concluido` nem `perdido`, retornar erro 409 "Lead já possui atendimento em andamento"
  - Caso válido: incrementar `cicloAtual`, resetar `statusFunil`, criar nova `Conversa` para o ciclo
- [x] Playwright: tentar criar atendimento para lead ativo → ver erro; criar para lead concluído → sucesso

**Arquivos críticos:**
- `components/features/kanban/KanbanView.tsx`
- `components/features/kanban/KanbanBoard.tsx`
- `app/(dashboard)/atendimentos/page.tsx`
- `components/features/kanban/NovoAtendimentoModal.tsx` _(novo)_
- `app/api/atendimentos/route.ts` _(novo)_

---

## Sprint 5 — Agendamentos: Google Calendar Obrigatório

**Objetivo:** Todo agendamento criado deve automaticamente ser registrado na agenda do médico. A integração não é opcional.

**Tarefas:**

- [x] `AgendamentoForm.tsx` — remover checkbox "Criar no Google Calendar"
- [x] `AgendamentoForm.tsx` — se Google Calendar não estiver configurado (verificar via `GET /api/configuracoes/google-agenda/status`), exibir banner de aviso com link para `/configuracoes/google-agenda`
- [x] `app/api/agendamentos/route.ts` — remover a condicional `if (criarNoGoogle)`: sempre executar `criarEvento()`
- [x] `app/api/agendamentos/route.ts` — se Google não configurado: criar agendamento mesmo assim, logar aviso; não falhar silenciosamente
- [x] Playwright: criar agendamento → verificar `googleEventId` preenchido no banco → verificar evento na agenda do médico (se possível via API do Google)

**Arquivos críticos:**
- `components/features/agendamentos/AgendamentoForm.tsx`
- `app/api/agendamentos/route.ts`
- `app/api/configuracoes/google-agenda/route.ts`

---

## Sprint 6 — Tipos de Procedimento Configuráveis

**Objetivo:** Permitir que o Gestor cadastre e gerencie os tipos de procedimento pelo painel, em vez de depender de código hardcoded.

**Tarefas:**

**Banco de dados:**
- [x] `schema.prisma` — adicionar modelo `TipoProcedimento` (`id`, `nome`, `ativo`, `criadoEm`)
- [x] `prisma/seed.ts` — seed com 3 tipos: Cirúrgico, Estético, Minimamente Invasivo
- [x] `npx prisma db push` — tabela `tipos_procedimento` criada

**API:**
- [x] `app/api/tipos-procedimento/route.ts` _(novo)_ — `GET` (público para autenticados) e `POST` (apenas Gestor)
- [x] `app/api/tipos-procedimento/[id]/route.ts` _(novo)_ — `PATCH` e `DELETE` (apenas Gestor)

**Front-end:**
- [x] `configuracoes/page.tsx` — adicionar card "Tipos de Procedimento" → `/configuracoes/tipos-procedimento`
- [x] `app/(dashboard)/configuracoes/tipos-procedimento/page.tsx` _(novo)_:
  - Lista com DataTable (nome, status ativo/inativo)
  - Botão "Novo Tipo" → modal com campo Nome
  - Editar e ativar/desativar por linha
- [x] `ProcedimentoForm.tsx` — substituir array hardcoded por `useEffect` que carrega tipos via `GET /api/tipos-procedimento`
- [x] Playwright: criar novo tipo → verificar que aparece no select do ProcedimentoForm

**Arquivos críticos:**
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `app/api/tipos-procedimento/route.ts` _(novo)_
- `app/(dashboard)/configuracoes/page.tsx`
- `app/(dashboard)/configuracoes/tipos-procedimento/page.tsx` _(novo)_
- `components/features/procedimentos/ProcedimentoForm.tsx`

---

## Sprint 7 — Uso de Mais Ícones

**Objetivo:** Padronizar e ampliar o uso de ícones `lucide-react` nos componentes que carecem de elementos visuais, melhorando a legibilidade e consistência da UI.

**Tarefas:**

- [x] `AgendamentoForm.tsx` — adicionar ícones `User`, `Stethoscope`, `Calendar`, `Clock`, `Timer`, `FileText` nos labels dos campos
- [x] `ModalMotivoPerdido.tsx` — adicionar ícone `XCircle` no título do dialog e `MessageSquare` no label do campo de motivo
- [x] `KanbanColuna.tsx` — adicionar ícone `Users` ao lado do contador de leads na coluna
- [x] `dashboard/page.tsx` — adicionar ícones `GitBranch`, `PieChart`, `Calendar`, `Clock`, `Bell` nos `CardHeader` das seções sem ícone
- [x] `TabelaProcedimentos.tsx` — adicionar ícone `Stethoscope` no header "Procedimento" e `BarChart2` no header "Agendamentos"

**Padrão seguido:**
- Tamanho: `h-4 w-4` (padrão do projeto)
- Biblioteca: `lucide-react` (exclusiva no projeto)
- Ícones em labels: `className="flex items-center gap-1.5"`
- Ícones em CardHeaders: `className="flex flex-row items-center gap-2"` no `CardHeader`
- Cor: `text-muted-foreground` para ícones decorativos, `text-destructive` para ação destrutiva

**Arquivos críticos:**
- `components/features/agendamentos/AgendamentoForm.tsx`
- `components/features/kanban/ModalMotivoPerdido.tsx`
- `components/features/kanban/KanbanColuna.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `components/features/relatorios/TabelaProcedimentos.tsx`

---

## Sprint 8 — Tooltips, Contexto e Autoexplicação

**Objetivo:** Fazer com que o usuário entenda o que cada elemento faz sem precisar de treinamento — tooltips em ícones, labels mais claros, campo Origem como Select, indicadores de período.

**Tarefas:**

- [x] `DataTable.tsx` — adicionar `<Tooltip>` nos botões de paginação ("Página anterior" / "Próxima página") e no botão de ordenação ("Ordenar por [coluna]")
- [x] `AppHeader.tsx` — adicionar `<Tooltip>` no `ThemeToggle` ("Alternar tema claro/escuro")
- [x] `KanbanCard.tsx` — adicionar `<Tooltip>` nos badges de follow-up (ex: "Follow-up de 1h enviado") e no tempo relativo (data/hora exata)
- [x] `KanbanFiltros.tsx` — adicionar `<Tooltip>` no botão "Limpar" ("Remover todos os filtros")
- [x] `StatusBadge.tsx` — adicionar `<Tooltip>` em cada status com descrição da etapa
- [x] `LeadsAlerta.tsx` — adicionar subtítulo/tooltip "Sem movimentação há 3+ dias" para contextualizar o alerta
- [x] `LeadForm.tsx` — trocar campo Origem (texto livre) por `Select` com opções fixas: WhatsApp, Instagram, Indicação, Site, Outros
- [x] `LeadForm.tsx` — adicionar `"(opcional)"` nos labels de Email e Procedimento de interesse
- [x] `relatorios/page.tsx` — exibir o período selecionado como subtitle no PageHeader
- [x] `ana-julia/page.tsx` — exibir o período selecionado como subtitle no PageHeader

**Arquivos críticos:**
- `components/features/shared/DataTable.tsx`
- `components/features/shared/AppHeader.tsx`
- `components/features/shared/StatusBadge.tsx`
- `components/features/kanban/KanbanCard.tsx`
- `components/features/kanban/KanbanFiltros.tsx`
- `components/features/leads/LeadForm.tsx`
- `components/features/dashboard/LeadsAlerta.tsx`
- `app/(dashboard)/relatorios/page.tsx`
- `app/(dashboard)/ana-julia/page.tsx`

---

## Sprint 9 — Feedback, Confirmações e Estados

**Objetivo:** Garantir que o usuário sempre saiba o que aconteceu após uma ação e que ações destrutivas tenham confirmação explícita.

**Tarefas:**

- [x] `KanbanBoard.tsx` — emitir `toast.success("Lead movido para [coluna]")` após mover card
- [x] `procedimentos/page.tsx` — adicionar `<ConfirmDialog>` antes de executar toggle ativo/inativo (ação destrutiva sem confirmação — crítico)
- [x] `leads/page.tsx` — adicionar `toast.success("Exportação iniciada")` após `window.open()` do CSV
- [x] `agendamentos/page.tsx` — adicionar labels "De:" e "Até:" visuais antes dos inputs de data nos filtros
- [x] `LeadsAlerta.tsx` — estado vazio: substituir mensagem neutra por "Tudo certo! Nenhum lead sem movimentação" com ícone `CheckCircle` verde
- [x] `LeadsFollowUpAtivos.tsx` — estado vazio: substituir por "Todos os follow-ups foram respondidos!" com ícone `CheckCircle` verde
- [x] `DataTable.tsx` — aceitar prop `mensagemVazio` para customizar mensagem de estado vazio por contexto
- [x] `configuracoes/usuarios/page.tsx` — exibir badge "Você" na linha do usuário da sessão atual

**Arquivos críticos:**
- `components/features/kanban/KanbanBoard.tsx`
- `app/(dashboard)/procedimentos/page.tsx`
- `app/(dashboard)/leads/page.tsx`
- `app/(dashboard)/agendamentos/page.tsx`
- `components/features/dashboard/LeadsAlerta.tsx`
- `components/features/dashboard/LeadsFollowUpAtivos.tsx`
- `components/features/shared/DataTable.tsx`
- `app/(dashboard)/configuracoes/usuarios/page.tsx`

---

## Sprint 10 — Navegação, Persistência e Orientação

**Objetivo:** Fazer com que o usuário não perca o contexto ao navegar e consiga retomar o trabalho de onde parou.

**Tarefas:**

- [x] `KanbanView.tsx` — persistir filtros como query params na URL (`/atendimentos?responsavel=id&procedimento=id`)
- [x] `leads/[id]/page.tsx` — borda laranja nos inputs enquanto há alterações não salvas + status "Não salvo" no indicador
- [x] `configuracoes/whatsapp/page.tsx` — badges numerados de passos (Credenciais → Instância → Conectado) com `CheckCircle2` nos concluídos
- [x] `configuracoes/google-agenda/page.tsx` — badges numerados de passos (Credenciais → Autorizar Google → Conectado)
- [x] `configuracoes/whatsapp/page.tsx` — countdown regressivo do QR Code (ex: 1:58) com destaque vermelho nos últimos 30s

**Arquivos críticos:**
- `components/features/kanban/KanbanFiltros.tsx`
- `app/(dashboard)/leads/[id]/page.tsx`
- `app/(dashboard)/configuracoes/whatsapp/page.tsx`
- `app/(dashboard)/configuracoes/google-agenda/page.tsx`

---

## Status Geral

| Sprint | Status |
|--------|--------|
| Sprint 1 — Controle de Acesso | ✅ Concluída |
| Sprint 2 — Header: Meu Perfil | ✅ Concluída |
| Sprint 3 — Dashboard: Alertas | ✅ Concluída |
| Sprint 4 — Kanban: Layout | ✅ Concluída |
| Sprint 5 — Agendamentos: Google | ✅ Concluída |
| Sprint 6 — Tipos de Procedimento | ✅ Concluída |
| Sprint 7 — Ícones | ✅ Concluída |
| Sprint 8 — Tooltips e Contexto | ✅ Concluída |
| Sprint 9 — Feedback e Confirmações | ✅ Concluída |
| Sprint 10 — Navegação e Persistência | ✅ Concluída |

---

## Ordem de Execução

```
Sprint 1 → Sprint 3 → Sprint 2 → Sprint 4 → Sprint 5 → Sprint 6 → Sprint 7 → Sprint 8 → Sprint 9 → Sprint 10
```

- Sprint 1 e 3 são as mais impactantes para UX e devem vir primeiro
- Sprint 2 é rápida e entrega valor visível imediato
- Sprint 4 resolve o maior problema técnico (kanban)
- Sprints 5 e 6 são melhorias de produto que podem vir depois
- Sprints 7, 8, 9 e 10 focam em polimento, usabilidade e intuitividade
